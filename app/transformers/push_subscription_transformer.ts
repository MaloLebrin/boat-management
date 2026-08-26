import type PushSubscription from '#models/push_subscription'
import type { PushSubscriptionRow } from '#shared/types/push'

/** N'expose jamais l'endpoint ni les clés — le front n'en a pas l'usage (#497). */
export function toRow(subscription: PushSubscription): PushSubscriptionRow {
  return {
    id: subscription.id,
    userAgent: subscription.userAgent,
    createdAt: subscription.createdAt.toISO()!,
    lastUsedAt: subscription.lastUsedAt?.toISO() ?? null,
  }
}
