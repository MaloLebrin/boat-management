import { createHash } from 'node:crypto'
import { DateTime } from 'luxon'
import PushSubscription from '#models/push_subscription'
import { PushSubscriptionNotFoundError } from '#exceptions/push_errors'
import type User from '#models/user'
import type { SubscribePushPayload } from '#shared/types/push'

function hashEndpoint(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('hex')
}

export default class PushSubscriptionService {
  /**
   * Upsert sur `endpoint_hash` : le navigateur renvoie le même endpoint à
   * chaque appel — un ré-abonnement rafraîchit les clés au lieu de dupliquer.
   * Si l'endpoint change de propriétaire (nouvelle session sur le même
   * navigateur), l'abonnement bascule vers le nouvel utilisateur.
   */
  async subscribe(user: User, payload: SubscribePushPayload, userAgent: string | null) {
    const endpointHash = hashEndpoint(payload.endpoint)
    const existing = await PushSubscription.query().where('endpointHash', endpointHash).first()

    if (existing) {
      existing.userId = user.id
      existing.organizationId = user.organizationId!
      existing.endpoint = payload.endpoint
      existing.p256dh = payload.keys.p256dh
      existing.auth = payload.keys.auth
      existing.userAgent = userAgent
      existing.failureCount = 0
      await existing.save()
      return existing
    }

    return PushSubscription.create({
      userId: user.id,
      organizationId: user.organizationId!,
      endpoint: payload.endpoint,
      endpointHash,
      p256dh: payload.keys.p256dh,
      auth: payload.keys.auth,
      userAgent,
      failureCount: 0,
    })
  }

  /** Désabonnement par endpoint (le navigateur ne connaît pas nos ids). */
  async unsubscribeByEndpoint(user: User, endpoint: string): Promise<void> {
    await PushSubscription.query()
      .where('userId', user.id)
      .where('endpointHash', hashEndpoint(endpoint))
      .delete()
  }

  /** Suppression d'un appareil depuis l'écran de gestion (#498) — scopée à l'utilisateur. */
  async unsubscribeById(user: User, subscriptionId: number): Promise<void> {
    const subscription = await PushSubscription.query()
      .where('id', subscriptionId)
      .where('userId', user.id)
      .first()
    if (!subscription) throw new PushSubscriptionNotFoundError()
    await subscription.delete()
  }

  async listForUser(userId: number): Promise<PushSubscription[]> {
    return PushSubscription.query().where('userId', userId).orderBy('createdAt', 'desc')
  }

  async markUsed(subscription: PushSubscription): Promise<void> {
    subscription.lastUsedAt = DateTime.now()
    subscription.failureCount = 0
    await subscription.save()
  }
}
