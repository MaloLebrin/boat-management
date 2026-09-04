import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { UserFactory } from '#database/factories/user_factory'
import PushSubscription from '#models/push_subscription'

/** #497 — routes d'abonnement Web Push (auth + throttle, réponses en redirection). */

const SUBSCRIPTION_BODY = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
}

test.group('Push subscriptions (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('POST /push/subscriptions crée un abonnement pour l’utilisateur connecté', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()

    const response = await client
      .post('/push/subscriptions')
      .loginAs(user)
      .redirects(0)
      .header('user-agent', 'iPhone Safari')
      .form(SUBSCRIPTION_BODY)

    response.assertStatus(302)

    const subscriptions = await PushSubscription.query().where('userId', user.id)
    assert.lengthOf(subscriptions, 1)
    assert.equal(subscriptions[0].endpoint, SUBSCRIPTION_BODY.endpoint)
    assert.equal(subscriptions[0].p256dh, 'p256dh-key')
    assert.equal(subscriptions[0].userAgent, 'iPhone Safari')
    assert.equal(subscriptions[0].organizationId, user.organizationId)
  })

  test('re-s’abonner au même endpoint est idempotent (upsert, pas de doublon)', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()

    await client.post('/push/subscriptions').loginAs(user).redirects(0).form(SUBSCRIPTION_BODY)
    await client
      .post('/push/subscriptions')
      .loginAs(user)
      .redirects(0)
      .form({ ...SUBSCRIPTION_BODY, keys: { p256dh: 'rotated', auth: 'rotated' } })

    const subscriptions = await PushSubscription.query().where('userId', user.id)
    assert.lengthOf(subscriptions, 1)
    // Le ré-abonnement rafraîchit les clés
    assert.equal(subscriptions[0].p256dh, 'rotated')
  })

  test('DELETE /push/subscriptions (par endpoint) supprime l’abonnement', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    await client.post('/push/subscriptions').loginAs(user).redirects(0).form(SUBSCRIPTION_BODY)

    const response = await client
      .delete('/push/subscriptions')
      .loginAs(user)
      .redirects(0)
      .form({ endpoint: SUBSCRIPTION_BODY.endpoint })

    response.assertStatus(302)
    assert.lengthOf(await PushSubscription.query().where('userId', user.id), 0)
  })

  test('DELETE /push/subscriptions/:id supprime un appareil de l’utilisateur', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    await client.post('/push/subscriptions').loginAs(user).redirects(0).form(SUBSCRIPTION_BODY)
    const sub = await PushSubscription.query().where('userId', user.id).firstOrFail()

    const response = await client.delete(`/push/subscriptions/${sub.id}`).loginAs(user).redirects(0)

    response.assertStatus(302)
    assert.isNull(await PushSubscription.find(sub.id))
  })

  test('un utilisateur ne peut pas supprimer l’abonnement d’un autre', async ({
    client,
    assert,
  }) => {
    const owner = await UserFactory.with('organization').create()
    const attacker = await UserFactory.with('organization').create()
    await client.post('/push/subscriptions').loginAs(owner).redirects(0).form(SUBSCRIPTION_BODY)
    const sub = await PushSubscription.query().where('userId', owner.id).firstOrFail()

    const response = await client
      .delete(`/push/subscriptions/${sub.id}`)
      .loginAs(attacker)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error')
    // L'abonnement du propriétaire est intact
    assert.isNotNull(await PushSubscription.find(sub.id))
  })

  test('401/redirection login sans authentification', async ({ client }) => {
    const response = await client.post('/push/subscriptions').redirects(0).form(SUBSCRIPTION_BODY)

    // Le middleware auth redirige vers /login pour les requêtes web
    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('GET /settings/notifications rend la page avec les appareils de l’utilisateur (#498)', async ({
    client,
  }) => {
    const user = await UserFactory.with('organization').create()
    await client.post('/push/subscriptions').loginAs(user).redirects(0).form(SUBSCRIPTION_BODY)

    const response = await client.get('/settings/notifications').loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('settings/notifications')
    const props = response.inertiaProps as { pushSubscriptions: Array<{ id: number }> }
    if (props.pushSubscriptions.length !== 1) {
      throw new Error(`expected 1 subscription prop, got ${props.pushSubscriptions.length}`)
    }
  })

  test('un endpoint non-HTTPS est rejeté par la validation', async ({ client, assert }) => {
    const user = await UserFactory.with('organization').create()

    const response = await client
      .post('/push/subscriptions')
      .loginAs(user)
      .redirects(0)
      .form({ endpoint: 'http://insecure.example/x', keys: { p256dh: 'a', auth: 'b' } })

    // Inertia redirige les erreurs de validation (pas de 422)
    response.assertStatus(302)
    assert.lengthOf(await PushSubscription.all(), 0)
  })
})
