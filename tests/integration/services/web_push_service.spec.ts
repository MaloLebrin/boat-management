import { createHash } from 'node:crypto'
import { test } from '@japa/runner'
import { UserFactory } from '#database/factories/user_factory'
import PushSubscription from '#models/push_subscription'
import PushSubscriptionService from '#services/push_subscription_service'
import WebPushService from '#services/web_push_service'
import type User from '#models/user'

/**
 * #497 — cycle de vie des abonnements à l'envoi. Japa n'a pas de mock de
 * module : `deliver` (l'appel réel à web-push) et `isEnabled` (la garde VAPID)
 * sont substitués par sous-classe.
 */

class HttpPushError extends Error {
  constructor(public readonly statusCode: number) {
    super(`push failed (${statusCode})`)
  }
}

function makeService(deliverImpl: (endpoint: string) => Promise<void>) {
  class TestWebPushService extends WebPushService {
    protected override isEnabled(): boolean {
      return true
    }

    protected override async deliver(subscription: { endpoint: string }): Promise<void> {
      await deliverImpl(subscription.endpoint)
    }
  }
  return new TestWebPushService(new PushSubscriptionService())
}

async function makeSubscription(user: User, endpoint: string) {
  return PushSubscription.create({
    userId: user.id,
    organizationId: user.organizationId!,
    endpoint,
    endpointHash: createHash('sha256').update(endpoint).digest('hex'),
    p256dh: 'p256dh-key',
    auth: 'auth-key',
    failureCount: 0,
  })
}

const PAYLOAD = {
  title: 'Maintenance en retard',
  body: 'Vidange moteur',
  actionUrl: '/planning',
  type: 'maintenance.overdue',
}

test.group('WebPushService.sendToUser', () => {
  test('un 410 purge immédiatement l’abonnement révoqué', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const sub = await makeSubscription(user, 'https://push.example/revoked')

    const service = makeService(async () => {
      throw new HttpPushError(410)
    })
    await service.sendToUser(user.id, PAYLOAD)

    assert.isNull(await PushSubscription.find(sub.id))
  })

  test('un 404 purge aussi (endpoint disparu)', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const sub = await makeSubscription(user, 'https://push.example/gone')

    const service = makeService(async () => {
      throw new HttpPushError(404)
    })
    await service.sendToUser(user.id, PAYLOAD)

    assert.isNull(await PushSubscription.find(sub.id))
  })

  test('un 429 ne purge pas — l’erreur remonte pour le retry du job', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const sub = await makeSubscription(user, 'https://push.example/throttled')

    const service = makeService(async () => {
      throw new HttpPushError(429)
    })

    let caught: unknown
    try {
      await service.sendToUser(user.id, PAYLOAD)
    } catch (error) {
      caught = error
    }

    assert.instanceOf(caught, HttpPushError)
    const kept = await PushSubscription.findOrFail(sub.id)
    assert.equal(kept.failureCount, 1)
  })

  test('un envoi réussi marque l’abonnement utilisé et remet failureCount à zéro', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const sub = await makeSubscription(user, 'https://push.example/ok')
    sub.failureCount = 2
    await sub.save()

    const service = makeService(async () => {})
    await service.sendToUser(user.id, PAYLOAD)

    const refreshed = await PushSubscription.findOrFail(sub.id)
    assert.equal(refreshed.failureCount, 0)
    assert.isNotNull(refreshed.lastUsedAt)
  })

  test('un échec sur un appareil n’empêche pas l’envoi aux autres', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    await makeSubscription(user, 'https://push.example/dead')
    const alive = await makeSubscription(user, 'https://push.example/alive')

    const delivered: string[] = []
    const service = makeService(async (endpoint) => {
      if (endpoint.endsWith('/dead')) throw new HttpPushError(410)
      delivered.push(endpoint)
    })
    await service.sendToUser(user.id, PAYLOAD)

    assert.deepEqual(delivered, ['https://push.example/alive'])
    assert.isNotNull(await PushSubscription.find(alive.id))
  })
})
