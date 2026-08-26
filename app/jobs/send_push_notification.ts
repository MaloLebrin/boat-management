import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { inject } from '@adonisjs/core'
import pushConfig from '#config/push'
import WebPushService from '#services/web_push_service'
import type { SendPushNotificationPayload } from '#shared/types/push'

/**
 * Envoi Web Push (#497). Payload dénormalisé (`userId`, `title`, `body`,
 * `actionUrl`, `type`) plutôt qu'un `notificationId` : le job reste correct si
 * la notification a été supprimée entre-temps.
 */
@inject()
export default class SendPushNotification extends Job<SendPushNotificationPayload> {
  static options: JobOptions = {
    queue: 'push',
    maxRetries: 3,
  }

  constructor(private webPushService: WebPushService) {
    super()
  }

  async execute() {
    // Sans clés VAPID, no-op — indispensable quand QUEUE_DRIVER=sync (tests) :
    // chaque création de notification exécuterait le job en ligne
    if (!pushConfig.enabled) return

    const { userId, ...payload } = this.payload
    await this.webPushService.sendToUser(userId, payload)
  }
}
