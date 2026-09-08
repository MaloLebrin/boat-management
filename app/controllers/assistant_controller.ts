import { AiInvalidResponseError } from '#exceptions/ai_errors'
import {
  AssistantActionEntityGoneError,
  AssistantActionNotAllowedError,
  AssistantConversationBudgetExceededError,
  AssistantConversationNotFoundError,
  AssistantCustomKeyFailedError,
  AssistantMaxMessagesReachedError,
  AssistantNoPendingActionError,
  AssistantPendingActionRequiredError,
} from '#exceptions/assistant_errors'
import { BoatEquipmentNotFoundError } from '#exceptions/boat_errors'
import { BoatFuelLogValidationError } from '#exceptions/fuel_log_errors'
import { BoatIncidentValidationError } from '#exceptions/incident_errors'
import { BoatMaintenanceTaskValidationError } from '#exceptions/maintenance_errors'
import {
  NavigationLogInProgressError,
  NavigationLogNotFoundError,
  NavigationLogValidationError,
} from '#exceptions/navigation_log_errors'
import { QuotaExceededError } from '#exceptions/quota_errors'
import {
  ReservationBlacklistedClientError,
  ReservationConflictError,
  ReservationDurationError,
  ReservationValidationError,
} from '#exceptions/reservation_errors'
import AssistantActionsService from '#services/assistant_actions_service'
import AssistantChatService from '#services/assistant_chat_service'
import AuditLogService from '#services/audit_log_service'
import { BoatNotFoundError } from '#services/boat_hull_service'
import QuotaService from '#services/quota_service'
import { assistantMessageValidator } from '#validators/assistant'
import { toAppLocale } from '#shared/helpers/locale_path'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Copilote FleetAi — panneau de chat global de l'app.
 *
 * Réservé aux plans avec IA : `assertCanUseAI` garde chaque action (le front
 * ouvre `UpgradePlanModal` en amont, même double garde que `AiController`).
 * Les mutations suivent la convention Inertia du repo : flash +
 * `redirect().back()`, jamais de JSON — le panneau se resynchronise par
 * partial reload de la prop partagée `assistantConversation`.
 *
 * `confirmAction` n'accepte AUCUN payload client : il exécute la proposition
 * stockée côté serveur (`pendingAction`), derrière le Bouncer du kind sur
 * l'entité rechargée (`AssistantActionsService.authorizeConfirm`).
 */
@inject()
export default class AssistantController {
  constructor(
    private actionsService: AssistantActionsService,
    private chatService: AssistantChatService,
    private quotaService: QuotaService,
    private auditLogService: AuditLogService
  ) {}

  async start(ctx: HttpContext) {
    const { request, auth, response, session, i18n } = ctx
    const user = await auth.authenticate()

    const payload = await request.validateUsing(assistantMessageValidator)

    try {
      await user.load('organization')
      this.quotaService.assertCanUseAI(user.organization)

      await this.chatService.start(user, payload.message, toAppLocale(i18n.locale), {
        pageUrl: payload.pageUrl ?? null,
        tzOffsetMinutes: payload.tzOffsetMinutes ?? null,
      })
    } catch (error) {
      this.#flashError(error, session, i18n)
    }

    return response.redirect().back()
  }

  async message(ctx: HttpContext) {
    const { request, auth, response, params, session, i18n } = ctx
    const user = await auth.authenticate()

    const payload = await request.validateUsing(assistantMessageValidator)

    try {
      await user.load('organization')
      this.quotaService.assertCanUseAI(user.organization)

      await this.chatService.addMessage(user, String(params.token), payload.message, {
        pageUrl: payload.pageUrl ?? null,
        tzOffsetMinutes: payload.tzOffsetMinutes ?? null,
      })
    } catch (error) {
      this.#flashError(error, session, i18n)
    }

    return response.redirect().back()
  }

  async confirmAction(ctx: HttpContext) {
    const { auth, response, params, bouncer, session, i18n } = ctx
    const user = await auth.authenticate()

    try {
      await user.load('organization')
      this.quotaService.assertCanUseAI(user.organization)

      const { conversation, proposal } =
        await this.chatService.getConversationWithPendingActionOrFail(user, String(params.token))

      // Entité rechargée côté serveur puis Bouncer par kind — jamais depuis
      // un payload client.
      const boat = await this.actionsService.resolveBoat(user, proposal)
      await this.actionsService.authorizeConfirm(bouncer, proposal, boat)

      const { outcome } = await this.chatService.confirmPendingAction(user, boat, conversation)

      // Même journal que la création manuelle équivalente.
      await this.auditLogService.log({
        organizationId: user.organizationId!,
        userId: user.id,
        action: outcome.auditAction,
        entityType: outcome.entityType,
        entityId: outcome.entityId,
        metadata: outcome.metadata,
      })

      session.flash('success', i18n.t(outcome.flashKey))
    } catch (error) {
      this.#flashError(error, session, i18n)
    }

    return response.redirect().back()
  }

  async dismissAction(ctx: HttpContext) {
    const { auth, response, params, session, i18n } = ctx
    const user = await auth.authenticate()

    try {
      await user.load('organization')
      this.quotaService.assertCanUseAI(user.organization)

      await this.chatService.dismissPendingAction(user, String(params.token))
    } catch (error) {
      this.#flashError(error, session, i18n)
    }

    return response.redirect().back()
  }

  async archive(ctx: HttpContext) {
    const { auth, response, params, session, i18n } = ctx
    const user = await auth.authenticate()

    try {
      await user.load('organization')
      this.quotaService.assertCanUseAI(user.organization)

      await this.chatService.archive(user, String(params.token))
    } catch (error) {
      this.#flashError(error, session, i18n)
    }

    return response.redirect().back()
  }

  #flashError(error: unknown, session: HttpContext['session'], i18n: HttpContext['i18n']): void {
    if (error instanceof QuotaExceededError) {
      session.flash(
        'error',
        i18n.t(error.feature === 'ai' ? 'flash.quota.aiExceeded' : 'flash.quota.aiTokensExceeded')
      )
    } else if (error instanceof AssistantConversationNotFoundError) {
      session.flash('error', i18n.t('flash.assistant.chatNotFound'))
    } else if (error instanceof AssistantMaxMessagesReachedError) {
      session.flash('error', i18n.t('flash.assistant.maxMessages'))
    } else if (error instanceof AssistantPendingActionRequiredError) {
      session.flash('error', i18n.t('flash.assistant.actionPending'))
    } else if (error instanceof AssistantNoPendingActionError) {
      session.flash('error', i18n.t('flash.assistant.noPendingAction'))
    } else if (error instanceof AssistantConversationBudgetExceededError) {
      session.flash('error', i18n.t('flash.assistant.budgetExceeded'))
    } else if (error instanceof AssistantCustomKeyFailedError) {
      session.flash('error', i18n.t('flash.assistant.customKeyFailed'))
    } else if (error instanceof AiInvalidResponseError) {
      session.flash('error', i18n.t('flash.assistant.invalidResponse'))
    } else if (error instanceof BoatNotFoundError) {
      // Le bateau de la proposition a disparu entre-temps (supprimé) :
      // la proposition n'est plus exécutable.
      session.flash('error', i18n.t('flash.assistant.boatNotFound'))
    } else if (error instanceof AssistantActionNotAllowedError) {
      session.flash('error', i18n.t('flash.assistant.actionNotAllowed'))
    } else if (error instanceof AssistantActionEntityGoneError) {
      session.flash('error', i18n.t('flash.assistant.actionEntityGone'))
    } else if (error instanceof NavigationLogInProgressError) {
      session.flash('error', i18n.t('flash.assistant.tripInProgress'))
    } else if (
      // Règle métier rejetée par le service à l'exécution (dates incohérentes,
      // conflit de réservation, client blacklisté, moteur hors bateau…) : la
      // proposition reste affichée, l'utilisateur peut la refuser.
      error instanceof BoatMaintenanceTaskValidationError ||
      error instanceof NavigationLogValidationError ||
      error instanceof NavigationLogNotFoundError ||
      error instanceof BoatFuelLogValidationError ||
      error instanceof BoatIncidentValidationError ||
      error instanceof ReservationValidationError ||
      error instanceof ReservationConflictError ||
      error instanceof ReservationDurationError ||
      error instanceof ReservationBlacklistedClientError ||
      error instanceof BoatEquipmentNotFoundError
    ) {
      session.flash('error', i18n.t('flash.assistant.actionFailed'))
    } else {
      throw error
    }
  }
}
