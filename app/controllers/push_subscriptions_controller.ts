import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { PushSubscriptionNotFoundError } from '#exceptions/push_errors'
import PushSubscriptionService from '#services/push_subscription_service'
import {
  subscribePushValidator,
  unsubscribePushValidator,
} from '#validators/push_subscription_validator'

/**
 * Abonnements Web Push (#497). Routes appelées depuis l'UI Inertia :
 * réponses en redirection, jamais de JSON (règle CLAUDE.md).
 */
@inject()
export default class PushSubscriptionsController {
  constructor(private subscriptionService: PushSubscriptionService) {}

  async store({ request, response, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(subscribePushValidator)

    await this.subscriptionService.subscribe(
      user,
      payload,
      request.header('user-agent')?.slice(0, 512) ?? null
    )

    response.redirect().back()
  }

  /** Désabonnement du navigateur courant (le client ne connaît que son endpoint). */
  async destroyByEndpoint({ request, response, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(unsubscribePushValidator)

    await this.subscriptionService.unsubscribeByEndpoint(user, payload.endpoint)

    response.redirect().back()
  }

  /** Suppression d'un appareil listé (#498) — scopée à l'utilisateur connecté. */
  async destroy({ params, response, auth, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()

    try {
      await this.subscriptionService.unsubscribeById(user, Number(params.id))
    } catch (error) {
      if (error instanceof PushSubscriptionNotFoundError) {
        session.flash('error', i18n.t('flash.push.subscriptionNotFound'))
        response.redirect().back()
        return
      }
      throw error
    }

    response.redirect().back()
  }
}
