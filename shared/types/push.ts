import type { NotificationType } from './notification.js'

/** Abonnement Web Push tel qu'exposé au frontend (gestion des appareils, #498). */
export interface PushSubscriptionRow {
  id: number
  userAgent: string | null
  createdAt: string
  lastUsedAt: string | null
}

/** Payload envoyé au navigateur via web-push, affiché par le SW (#496). */
export interface PushNotificationPayload {
  title: string
  body: string | null
  actionUrl: string | null
  type: NotificationType
}

/** Payload du job — dénormalisé : reste correct si la notification d'origine a été supprimée. */
export interface SendPushNotificationPayload extends PushNotificationPayload {
  userId: number
}

/** Corps du POST /push/subscriptions (PushSubscription.toJSON() du navigateur). */
export interface SubscribePushPayload {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}
