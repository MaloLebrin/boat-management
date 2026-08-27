import logger from '@adonisjs/core/services/logger'
import { inject } from '@adonisjs/core'
import webPush from 'web-push'
import pushConfig from '#config/push'
import PushSubscriptionService from '#services/push_subscription_service'
import type { PushNotificationPayload } from '#shared/types/push'

let vapidConfigured = false

function ensureVapidConfigured() {
  if (vapidConfigured) return
  // La clé privée est un `Secret<string>` (Env.schema.secret) : release() au
  // dernier moment, uniquement ici
  webPush.setVapidDetails(
    pushConfig.vapidSubject,
    pushConfig.vapidPublicKey!,
    pushConfig.vapidPrivateKey!.release()
  )
  vapidConfigured = true
}

@inject()
export default class WebPushService {
  constructor(private subscriptionService: PushSubscriptionService) {}

  /**
   * Envoi effectif — isolé pour être substituable en test unitaire (Japa n'a
   * pas de mock de module) : les specs surchargent `deliver` pour simuler les
   * réponses du push service (410, 429…).
   */
  protected async deliver(
    subscription: { endpoint: string; p256dh: string; auth: string },
    body: string
  ): Promise<void> {
    ensureVapidConfigured()
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      body
    )
  }

  /** Substituable en test — permet d'exercer la logique 410/429 sans clés VAPID. */
  protected isEnabled(): boolean {
    return pushConfig.enabled
  }

  /**
   * Envoie la notification à tous les appareils abonnés de l'utilisateur.
   *
   * - 404/410 : l'endpoint est révoqué (PWA retirée de l'écran d'accueil sans
   *   que le serveur en soit informé) → **suppression immédiate** de
   *   l'abonnement, sinon la table pourrit.
   * - 429 et autres échecs transitoires : on relance l'erreur pour laisser le
   *   retry du job faire son travail — jamais de purge.
   */
  async sendToUser(userId: number, payload: PushNotificationPayload): Promise<void> {
    if (!this.isEnabled()) return

    const subscriptions = await this.subscriptionService.listForUser(userId)
    if (subscriptions.length === 0) return

    const body = JSON.stringify(payload)
    const failures: unknown[] = []

    for (const subscription of subscriptions) {
      try {
        await this.deliver(subscription, body)
        await this.subscriptionService.markUsed(subscription)
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          logger.info(
            { subscriptionId: subscription.id, statusCode },
            'push endpoint gone — purging subscription'
          )
          await subscription.delete()
          continue
        }
        subscription.failureCount += 1
        await subscription.save()
        failures.push(error)
      }
    }

    if (failures.length > 0) {
      // Relancé pour déclencher le retry du job (429, 5xx du push service…)
      throw failures[0]
    }
  }
}
