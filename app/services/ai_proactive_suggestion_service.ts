import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import i18nManager from '@adonisjs/i18n/services/main'
import { DateTime } from 'luxon'
import { QuotaExceededError } from '#exceptions/quota_errors'
import Boat from '#models/boat'
import Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import AiAnalysisService from '#services/ai_analysis_service'
import AiSuggestionContextService from '#services/ai_suggestion_context_service'
import AiTokenQuotaService from '#services/ai_token_quota_service'
import NotificationService from '#services/notification_service'
import QuotaService from '#services/quota_service'
import { DEMO_ORG_SLUG } from '#shared/constants/demo'
import { toAppLocale } from '#shared/helpers/locale_path'
import type { AiSuggestionLocale } from '#shared/types/ai'
import { computeContextHash } from '#utils/context_hash'

/** Cadence : pas de régénération d'une analyse plus récente que N jours. */
const MIN_AGE_DAYS = 7
/** Anti-doublon : pas de re-notification d'un même bateau avant N jours. */
const NOTIF_DEDUPE_DAYS = 6
/** Garde-fou : plafond d'appels Mistral par run, tous scopes confondus. */
const MAX_GENERATIONS_PER_RUN = 200

export interface ProactiveRunResult {
  generated: number
  skippedRecent: number
  skippedUnchanged: number
  notified: number
}

/** Bateau dont au moins une analyse (bateau ou moteur) a été régénérée. */
interface RegeneratedBoat {
  organizationId: number
  boatId: number
  boatName: string
  count: number
}

/**
 * Génération planifiée des suggestions IA (bateaux + moteurs).
 *
 * Parcourt les organisations éligibles (`canUseAI`, quota de tokens non
 * épuisé, hors démo) et régénère les analyses dont le contexte a changé —
 * comparaison de `contextHash` avec la dernière analyse du scope, cadence
 * minimale de {@link MIN_AGE_DAYS} jours. Les lignes créées portent
 * `userId: null` : elles appartiennent à l'organisation. Chaque bateau
 * régénéré vaut une notification `ai.suggestions_ready` aux admins de l'org
 * (anti-spam `createIfNotRecent`, cf. `NotificationScanService`).
 *
 * Orgs et analyses sont traitées séquentiellement : le verrou d'org du quota
 * est mono-processus et Mistral limite le débit — paralléliser n'apporterait
 * rien de sûr.
 */
@inject()
export default class AiProactiveSuggestionService {
  constructor(
    private aiAnalysisService: AiAnalysisService,
    private contextService: AiSuggestionContextService,
    private aiTokenQuotaService: AiTokenQuotaService,
    private quotaService: QuotaService,
    private notificationService: NotificationService
  ) {}

  async run(): Promise<ProactiveRunResult> {
    const result: ProactiveRunResult = {
      generated: 0,
      skippedRecent: 0,
      skippedUnchanged: 0,
      notified: 0,
    }
    const regeneratedBoats = new Map<number, RegeneratedBoat>()

    const organizations = await Organization.query().whereNot('slug', DEMO_ORG_SLUG).orderBy('id')

    for (const org of organizations) {
      if (result.generated >= MAX_GENERATIONS_PER_RUN) break
      if (!(await this.isOrgEligible(org))) continue

      await this.runForOrg(org, result, regeneratedBoats)
    }

    result.notified = await this.notifyAdmins(regeneratedBoats)
    return result
  }

  /** Plan `canUseAI` + quota mensuel de tokens non épuisé. */
  private async isOrgEligible(org: Organization): Promise<boolean> {
    try {
      this.quotaService.assertCanUseAI(org)
      const currentUsage = await this.aiTokenQuotaService.getUsage(org.id)
      this.aiTokenQuotaService.assertCanUseTokens(org, currentUsage)
      return true
    } catch (error) {
      if (error instanceof QuotaExceededError) return false
      throw error
    }
  }

  private async runForOrg(
    org: Organization,
    result: ProactiveRunResult,
    regeneratedBoats: Map<number, RegeneratedBoat>
  ): Promise<void> {
    const locales = await this.memberLocales(org.id)
    if (locales.length === 0) return

    const boats = await Boat.query()
      .where('organizationId', org.id)
      .preload('engines', (query) => query.orderBy('id', 'asc'))
      .orderBy('id', 'asc')

    for (const boat of boats) {
      const scopes: Array<{ kind: 'boat_suggestions' | 'engine_suggestions'; engineId?: number }> =
        [
          { kind: 'boat_suggestions' },
          ...boat.engines.map((engine) => ({
            kind: 'engine_suggestions' as const,
            engineId: engine.id,
          })),
        ]

      for (const scope of scopes) {
        for (const locale of locales) {
          if (result.generated >= MAX_GENERATIONS_PER_RUN) return

          try {
            const generated = await this.generateScopeIfStale(org, boat, scope, locale, result)
            if (generated) this.recordRegeneratedBoat(regeneratedBoats, boat)
          } catch (error) {
            if (error instanceof QuotaExceededError) {
              // Quota de tokens atteint en cours de route : on abandonne
              // l'organisation sans faire échouer le run (cf. RunAiChat).
              logger.warn(
                { organizationId: org.id },
                'AiProactiveSuggestionService: token quota reached, skipping organization'
              )
              return
            }
            // Un bateau en erreur ne doit pas couler le run entier.
            logger.error(
              { err: error, organizationId: org.id, boatId: boat.id, scope },
              'AiProactiveSuggestionService: generation failed'
            )
          }
        }
      }
    }
  }

  /**
   * Régénère un scope (bateau ou moteur) dans une locale si sa dernière
   * analyse est assez ancienne ET que le contexte a changé.
   *
   * @returns `true` si une analyse a été générée
   */
  private async generateScopeIfStale(
    org: Organization,
    boat: Boat,
    scope: { kind: 'boat_suggestions' | 'engine_suggestions'; engineId?: number },
    locale: AiSuggestionLocale,
    result: ProactiveRunResult
  ): Promise<boolean> {
    const latest = await this.aiAnalysisService.getLatestForScope(
      scope.kind,
      org.id,
      scope.kind === 'boat_suggestions' ? { boatId: boat.id } : { engineId: scope.engineId },
      locale
    )

    if (latest && latest.createdAt > DateTime.now().minus({ days: MIN_AGE_DAYS })) {
      result.skippedRecent++
      return false
    }

    if (scope.kind === 'boat_suggestions') {
      const input = await this.contextService.buildBoatInput(boat.id)
      if (latest?.contextHash === computeContextHash(input)) {
        result.skippedUnchanged++
        return false
      }
      await this.aiAnalysisService.generateBoatSuggestions(
        null,
        boat.id,
        org,
        input,
        locale,
        org.aiSystemPrompt,
        org.aiModelOverride
      )
    } else {
      const engine = boat.engines.find((e) => e.id === scope.engineId)!
      const input = await this.contextService.buildEngineInput(boat, engine, locale)
      if (latest?.contextHash === computeContextHash(input)) {
        result.skippedUnchanged++
        return false
      }
      await this.aiAnalysisService.generateEngineSuggestions(
        null,
        boat.id,
        engine.id,
        org,
        input,
        locale,
        org.aiSystemPrompt,
        org.aiModelOverride
      )
    }

    result.generated++
    return true
  }

  private recordRegeneratedBoat(map: Map<number, RegeneratedBoat>, boat: Boat): void {
    const existing = map.get(boat.id)
    if (existing) {
      existing.count++
      return
    }
    map.set(boat.id, {
      organizationId: boat.organizationId,
      boatId: boat.id,
      boatName: boat.name,
      count: 1,
    })
  }

  /**
   * Locales distinctes des membres de l'organisation — une génération par
   * locale, pour que chacun lise les suggestions dans sa langue (#460).
   */
  private async memberLocales(organizationId: number): Promise<AiSuggestionLocale[]> {
    const memberships = await OrganizationMembership.query()
      .where('organizationId', organizationId)
      .preload('user')
    const locales = new Set<AiSuggestionLocale>(
      memberships.map((membership) => toAppLocale(membership.user.locale))
    )
    return [...locales]
  }

  /**
   * Une notification `ai.suggestions_ready` par (bateau régénéré × admin de
   * l'org), dans la locale de chaque admin, dédupliquée sur
   * {@link NOTIF_DEDUPE_DAYS} jours.
   */
  private async notifyAdmins(regeneratedBoats: Map<number, RegeneratedBoat>): Promise<number> {
    if (regeneratedBoats.size === 0) return 0

    const groups = [...regeneratedBoats.values()]
    const orgIds = [...new Set(groups.map((group) => group.organizationId))]
    const adminsByOrg = new Map(
      await Promise.all(orgIds.map(async (orgId) => [orgId, await this.adminsFor(orgId)] as const))
    )

    const results = await Promise.all(
      groups.flatMap((group) => {
        const params = { boatName: group.boatName, count: String(group.count) }
        return (adminsByOrg.get(group.organizationId) ?? []).map((admin) => {
          const locale = i18nManager.locale(toAppLocale(admin.user.locale))
          return this.notificationService.createIfNotRecent(
            {
              userId: admin.user.id,
              organizationId: group.organizationId,
              type: 'ai.suggestions_ready',
              severity: 'info',
              title: locale.formatMessage(
                'notifications.messages.ai.suggestions_ready.title',
                params
              ),
              body: locale.formatMessage(
                'notifications.messages.ai.suggestions_ready.body',
                params
              ),
              actionUrl: `/boats/${group.boatId}`,
              metadata: { boatId: group.boatId, count: group.count },
            },
            { metadataKey: 'boatId', withinDays: NOTIF_DEDUPE_DAYS }
          )
        })
      })
    )

    return results.filter((notification) => notification !== null).length
  }

  /** Admins d'une organisation, relation `user` préchargée (cf. `NotificationScanService`). */
  private async adminsFor(organizationId: number): Promise<OrganizationMembership[]> {
    return OrganizationMembership.query()
      .where('organizationId', organizationId)
      .where('role', 'admin')
      .preload('user')
  }
}
