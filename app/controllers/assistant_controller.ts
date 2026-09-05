import { AiInvalidResponseError } from '#exceptions/ai_errors'
import {
  AssistantConversationBudgetExceededError,
  AssistantConversationNotFoundError,
  AssistantCustomKeyFailedError,
  AssistantMaxMessagesReachedError,
  AssistantNoPendingActionError,
  AssistantPendingActionRequiredError,
} from '#exceptions/assistant_errors'
import { BoatMaintenanceTaskValidationError } from '#exceptions/maintenance_errors'
import { QuotaExceededError } from '#exceptions/quota_errors'
import MaintenancePolicy from '#policies/maintenance_policy'
import AssistantChatService from '#services/assistant_chat_service'
import AuditLogService from '#services/audit_log_service'
import BoatHullService, { BoatNotFoundError } from '#services/boat_hull_service'
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
 * stockée côté serveur (`pendingAction`), derrière `MaintenancePolicy.create`.
 */
@inject()
export default class AssistantController {
  constructor(
    private chatService: AssistantChatService,
    private boatService: BoatHullService,
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

      await this.chatService.start(user, payload.message, toAppLocale(i18n.locale))
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

      await this.chatService.addMessage(user, String(params.token), payload.message)
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

      const boat = await this.boatService.getForUserOrFail(user, proposal.boatId)
      await bouncer.with(MaintenancePolicy).authorize('create', boat)

      const { task } = await this.chatService.confirmPendingAction(user, boat, conversation)

      // Même journal que la création manuelle (`boat_maintenance_tasks_controller`).
      await this.auditLogService.log({
        organizationId: user.organizationId!,
        userId: user.id,
        action: 'maintenance_task.create',
        entityType: 'maintenance_task',
        entityId: task.id,
        metadata: { name: task.title, boatName: boat.name },
      })

      session.flash('success', i18n.t('flash.assistant.taskCreated'))
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
    } else if (error instanceof BoatMaintenanceTaskValidationError) {
      session.flash('error', i18n.t('flash.assistant.invalidResponse'))
    } else {
      throw error
    }
  }
}
