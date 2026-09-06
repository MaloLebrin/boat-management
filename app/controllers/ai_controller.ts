import BoatPolicy from '#policies/boat_policy'
import MaintenancePolicy from '#policies/maintenance_policy'
import AiAnalysisService from '#services/ai_analysis_service'
import AiQueueService from '#services/ai_queue_service'
import BoatEngineDiagnosticService, {
  BoatEquipmentNotFoundError,
  EngineNotDiagnosticEligibleError,
} from '#services/boat_engine_diagnostic_service'
import AiSuggestionContextService from '#services/ai_suggestion_context_service'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import DashboardService from '#services/dashboard_service'
import QuotaService from '#services/quota_service'
import { AiInvalidResponseError } from '#exceptions/ai_errors'
import { QuotaExceededError } from '#exceptions/quota_errors'
import { aiChatValidator, engineDiagnosisValidator } from '#validators/ai'
import { toAppLocale } from '#shared/helpers/locale_path'
import { errors as bouncerErrors } from '@adonisjs/bouncer'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class AiController {
  constructor(
    private aiQueueService: AiQueueService,
    private dashboardService: DashboardService,
    private aiAnalysisService: AiAnalysisService,
    private boatService: BoatService,
    private suggestionContextService: AiSuggestionContextService,
    private quotaService: QuotaService,
    private diagnosticService: BoatEngineDiagnosticService
  ) {}

  async chat({ request, response, auth, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    await user.load('organization')
    try {
      this.quotaService.assertCanUseAI(user.organization)
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        session.flash('error', i18n.t('flash.quota.aiExceeded'))
        return response.redirect().back()
      }
      throw error
    }

    const { messages } = await request.validateUsing(aiChatValidator)

    await this.aiQueueService.enqueueChat({
      userId: user.id,
      organizationId: user.organization.id,
      messages,
    })

    session.flash('info', i18n.t('flash.ai.chatQueued'))
    return response.redirect().back()
  }

  async fleetAnalysis({ response, auth, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    await user.load('organization')
    try {
      this.quotaService.assertCanUseAI(user.organization)
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        session.flash('error', i18n.t('flash.quota.aiExceeded'))
        return response.redirect().back()
      }
      throw error
    }

    try {
      const data = await this.dashboardService.getForUser(user)
      await this.aiAnalysisService.generateFleetAnalysis(
        user.id,
        user.organization,
        data,
        toAppLocale(i18n.locale),
        user.organization.aiSystemPrompt,
        user.organization.aiModelOverride
      )
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        session.flash('error', i18n.t('flash.quota.aiTokensExceeded'))
      } else {
        session.flash('error', i18n.t('flash.ai.analysisError'))
      }
    }

    return response.redirect('/')
  }

  async boatSuggestions({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    const boatId = Number(params.id)

    await user.load('organization')
    try {
      this.quotaService.assertCanUseAI(user.organization)
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        session.flash('error', i18n.t('flash.quota.aiExceeded'))
        return response.redirect().back()
      }
      throw error
    }

    try {
      const boat = await this.boatService.getForUserOrFail(user, boatId)
      await bouncer.with(BoatPolicy).authorize('view', boat)

      // Contexte construit par le service partagé avec le job planifié : les
      // deux chemins produisent le même input, donc le même `contextHash`.
      const input = await this.suggestionContextService.buildBoatInput(boat.id)

      await this.aiAnalysisService.generateBoatSuggestions(
        user.id,
        boat.id,
        user.organization,
        input,
        toAppLocale(i18n.locale),
        user.organization.aiSystemPrompt,
        user.organization.aiModelOverride
      )
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        // no flash — boat not found is handled silently
      } else if (error instanceof QuotaExceededError) {
        session.flash('error', i18n.t('flash.quota.aiTokensExceeded'))
      } else if (error instanceof bouncerErrors.E_AUTHORIZATION_FAILURE) {
        throw error
      } else {
        session.flash('error', i18n.t('flash.ai.analysisError'))
      }
    }

    return response.redirect(`/boats/${boatId}`)
  }

  /**
   * Suggestions de maintenance d'un moteur — réplique le pattern
   * `boatSuggestions` scopé sur un moteur : quota plan → contexte (pièces,
   * tâches, catalogue d'opérations) → service → redirection vers la page
   * moteur (la prop différée `aiSuggestions` recharge l'analyse).
   */
  async engineSuggestions({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    const boatId = Number(params.boatId)
    const engineId = Number(params.engineId)

    await user.load('organization')
    try {
      this.quotaService.assertCanUseAI(user.organization)
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        session.flash('error', i18n.t('flash.quota.aiExceeded'))
        return response.redirect().back()
      }
      throw error
    }

    try {
      const boat = await this.boatService.getForUserOrFail(user, boatId)
      await bouncer.with(BoatPolicy).authorize('view', boat)

      const engine = boat.engines.find((e) => e.id === engineId)
      if (!engine) throw new BoatEquipmentNotFoundError()

      const locale = toAppLocale(i18n.locale)
      const input = await this.suggestionContextService.buildEngineInput(boat, engine, locale)

      await this.aiAnalysisService.generateEngineSuggestions(
        user.id,
        boat.id,
        engine.id,
        user.organization,
        input,
        locale,
        user.organization.aiSystemPrompt,
        user.organization.aiModelOverride
      )
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        // no flash — boat not found is handled silently
      } else if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
      } else if (error instanceof QuotaExceededError) {
        session.flash('error', i18n.t('flash.quota.aiTokensExceeded'))
      } else if (error instanceof bouncerErrors.E_AUTHORIZATION_FAILURE) {
        throw error
      } else {
        session.flash('error', i18n.t('flash.ai.analysisError'))
      }
    }

    return response.redirect(`/boats/${boatId}/engines/${engineId}`)
  }

  /**
   * Diagnostic de panne moteur assisté par IA (#516) — réplique le pattern
   * `boatSuggestions` : quota plan → contexte moteur + checklists → service →
   * flash + redirection Inertia (la page checklist recharge l'analyse).
   */
  async engineDiagnosis({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    await user.load('organization')
    try {
      this.quotaService.assertCanUseAI(user.organization)
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        session.flash('error', i18n.t('flash.quota.aiExceeded'))
        return response.redirect().back()
      }
      throw error
    }

    const payload = await request.validateUsing(engineDiagnosisValidator)

    try {
      const boat = await this.boatService.getForUserOrFail(user, Number(params.boatId))
      await bouncer.with(MaintenancePolicy).authorize('view', boat)

      const engine = await this.diagnosticService.getEligibleEngineOrFail(
        user,
        boat,
        Number(params.engineId)
      )
      const context = await this.diagnosticService.getDiagnosisContext(engine)

      await this.aiAnalysisService.generateEngineDiagnosis(
        user.id,
        boat.id,
        engine.id,
        user.organization,
        {
          ...context,
          mode: payload.mode,
          userText: (payload.mode === 'symptoms' ? payload.symptoms : payload.notes) ?? '',
        },
        toAppLocale(i18n.locale),
        user.organization.aiSystemPrompt,
        user.organization.aiModelOverride
      )
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        // no flash — boat not found is handled silently
      } else if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
      } else if (error instanceof EngineNotDiagnosticEligibleError) {
        session.flash('error', i18n.t('flash.diagnostic.notEligible'))
      } else if (error instanceof QuotaExceededError) {
        session.flash('error', i18n.t('flash.quota.aiTokensExceeded'))
      } else if (error instanceof AiInvalidResponseError) {
        session.flash('error', i18n.t('flash.ai.diagnosisInvalidResponse'))
      } else if (error instanceof bouncerErrors.E_AUTHORIZATION_FAILURE) {
        throw error
      } else {
        session.flash('error', i18n.t('flash.ai.analysisError'))
      }
    }

    return response.redirect().back()
  }
}
