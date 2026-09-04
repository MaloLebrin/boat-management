import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { UserFactory } from '#database/factories/user_factory'
import { DEMO_EMAIL, DEMO_SESSION_DURATION_MS } from '#shared/constants/demo'

/**
 * #478 — l'expiration d'une session démo renvoyait une page 500.
 *
 * `check_demo_session_middleware` était enregistré dans `start/kernel.ts` AVANT
 * `detect_user_locale_middleware`, le middleware qui pose `ctx.i18n`. Sa branche
 * d'expiration appelait donc `ctx.i18n.t(...)` sur un `undefined` :
 * `TypeError: Cannot read properties of undefined (reading 't')`. La branche
 * n'avait jamais pu fonctionner — le visiteur voyait une erreur 500 au lieu
 * d'être redirigé vers la connexion avec le flash « session expirée ».
 */
test.group('Demo session expiry (#478)', (group) => {
  group.each.setup(() => truncateDb())

  async function createDemoUser() {
    return UserFactory.merge({ email: DEMO_EMAIL })
      .with('organization', 1, (org) => org.merge({ slug: 'marina-demo' }))
      .create()
  }

  test('an expired demo session redirects to the login page instead of crashing', async ({
    client,
  }) => {
    const demoUser = await createDemoUser()

    const response = await client
      .get('/dashboard')
      .loginAs(demoUser)
      .withSession({ demoSessionStartedAt: Date.now() - (DEMO_SESSION_DURATION_MS + 60_000) })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
    response.assertFlashMessage(
      'info',
      'Your demo session has expired (15 min). Log in again to start over.'
    )
  })

  test('a demo session without a start timestamp is treated as expired', async ({ client }) => {
    const demoUser = await createDemoUser()

    const response = await client.get('/dashboard').loginAs(demoUser).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
    response.assertFlashMessage(
      'info',
      'Your demo session has expired (15 min). Log in again to start over.'
    )
  })

  test('a demo session still within its window is left untouched', async ({ client, assert }) => {
    const demoUser = await createDemoUser()
    const startedAt = Date.now()

    const response = await client
      .get('/dashboard')
      .loginAs(demoUser)
      .withSession({ demoSessionStartedAt: startedAt })
      .withInertia()

    response.assertStatus(200)
    assert.equal(response.session().demoSessionStartedAt, startedAt)
  })
})
