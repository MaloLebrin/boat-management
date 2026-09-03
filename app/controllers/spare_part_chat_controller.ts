import { AiInvalidResponseError } from '#exceptions/ai_errors'
import { QuotaExceededError } from '#exceptions/quota_errors'
import {
  PartSearchConversationCompletedError,
  PartSearchConversationNotFoundError,
  PartSearchMaxMessagesReachedError,
} from '#exceptions/spare_part_chat_errors'
import MaintenancePolicy from '#policies/maintenance_policy'
import BoatEngineSparePartsService, {
  BoatEquipmentNotFoundError,
  EngineNotSparePartsEligibleError,
} from '#services/boat_engine_spare_parts_service'
import BoatHullService, { BoatNotFoundError } from '#services/boat_hull_service'
import QuotaService from '#services/quota_service'
import SparePartChatService from '#services/spare_part_chat_service'
import { toPartSearchConversationProps } from '#transformers/spare_part_chat_transformer'
import { sparePartChatMessageValidator } from '#validators/spare_part_chat'
import { toAppLocale } from '#shared/helpers/locale_path'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Chat IA de recherche de références de pièces (#634).
 *
 * Réservé aux plans avec IA : `assertCanUseAI` garde chaque action (le front
 * ouvre `UpgradePlanModal` en amont, même double garde que `AiController`).
 * Les mutations suivent la convention Inertia du repo : flash +
 * `redirect().back()`, jamais de JSON.
 */
@inject()
export default class SparePartChatController {
  constructor(
    private boatService: BoatHullService,
    private sparePartsService: BoatEngineSparePartsService,
    private quotaService: QuotaService,
    private chatService: SparePartChatService
  ) {}

  private async loadBoat(ctx: Pick<HttpContext, 'auth' | 'response' | 'params'>) {
    const user = ctx.auth.getUserOrFail()
    try {
      const boat = await this.boatService.getForUserOrFail(user, Number(ctx.params.boatId))
      return { user, boat }
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        ctx.response.redirect('/boats')
        return null
      }
      throw error
    }
  }

  async show(ctx: HttpContext) {
    const { inertia, auth, response, params, bouncer, session, i18n } = ctx
    await auth.authenticate()
    const loaded = await this.loadBoat(ctx)
    if (!loaded) return
    const { user, boat } = loaded

    await bouncer.with(MaintenancePolicy).authorize('view', boat)

    const engineId = Number(params.engineId)
    try {
      const engine = await this.sparePartsService.getEligibleEngineOrFail(user, boat, engineId)

      await user.load('organization')
      this.quotaService.assertCanUseAI(user.organization)

      const conversation = await this.chatService.getLatestConversation(user, engine)
      const canManage = await bouncer.with(MaintenancePolicy).allows('edit', boat)

      return inertia.render('spare_parts/chat', {
        boat: { id: boat.id, name: boat.name },
        engine: await this.sparePartsService.getEngineProps(engine),
        conversation: conversation ? toPartSearchConversationProps(conversation) : null,
        canManage,
      })
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        session.flash('error', i18n.t('flash.quota.aiExceeded'))
        return response.redirect(`/boats/${boat.id}/engines/${engineId}/spare-parts`)
      }
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
        return response.redirect(`/boats/${boat.id}`)
      }
      if (error instanceof EngineNotSparePartsEligibleError) {
        session.flash('error', i18n.t('flash.spareParts.notEligible'))
        return response.redirect(`/boats/${boat.id}/engines/${engineId}`)
      }
      throw error
    }
  }

  async start(ctx: HttpContext) {
    const { request, auth, response, params, bouncer, session, i18n } = ctx
    await auth.authenticate()
    const loaded = await this.loadBoat(ctx)
    if (!loaded) return
    const { user, boat } = loaded

    await bouncer.with(MaintenancePolicy).authorize('view', boat)

    const payload = await request.validateUsing(sparePartChatMessageValidator)

    try {
      const engine = await this.sparePartsService.getEligibleEngineOrFail(
        user,
        boat,
        Number(params.engineId)
      )

      await user.load('organization')
      this.quotaService.assertCanUseAI(user.organization)

      await this.chatService.start(user, engine, payload.message, toAppLocale(i18n.locale))
    } catch (error) {
      this.#flashError(error, session, i18n)
    }

    return response.redirect().back()
  }

  async message(ctx: HttpContext) {
    const { request, auth, response, params, bouncer, session, i18n } = ctx
    await auth.authenticate()
    const loaded = await this.loadBoat(ctx)
    if (!loaded) return
    const { user, boat } = loaded

    await bouncer.with(MaintenancePolicy).authorize('view', boat)

    const payload = await request.validateUsing(sparePartChatMessageValidator)

    try {
      const engine = await this.sparePartsService.getEligibleEngineOrFail(
        user,
        boat,
        Number(params.engineId)
      )

      await user.load('organization')
      this.quotaService.assertCanUseAI(user.organization)

      await this.chatService.addMessage(user, engine, String(params.token), payload.message)
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
    } else if (error instanceof PartSearchConversationNotFoundError) {
      session.flash('error', i18n.t('flash.spareParts.chatNotFound'))
    } else if (error instanceof PartSearchConversationCompletedError) {
      session.flash('error', i18n.t('flash.spareParts.chatCompleted'))
    } else if (error instanceof PartSearchMaxMessagesReachedError) {
      session.flash('error', i18n.t('flash.spareParts.chatMaxMessages'))
    } else if (error instanceof AiInvalidResponseError) {
      session.flash('error', i18n.t('flash.ai.diagnosisInvalidResponse'))
    } else if (error instanceof BoatEquipmentNotFoundError) {
      session.flash('error', i18n.t('flash.engine.notFound'))
    } else if (error instanceof EngineNotSparePartsEligibleError) {
      session.flash('error', i18n.t('flash.spareParts.notEligible'))
    } else {
      throw error
    }
  }
}
