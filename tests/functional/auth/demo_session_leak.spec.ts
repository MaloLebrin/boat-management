import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser } from '#tests/functional/helpers'
import { UserFactory } from '#database/factories/user_factory'

/**
 * #451 — la bannière « Session démo » fuyait sur les comptes réels.
 *
 * `DemoController.login` pose `demoSessionStartedAt` en session, mais ni le
 * logout ni le login suivant ne purgeaient la clé, et `inertia_middleware`
 * la partageait sans vérifier que l'utilisateur courant est bien le compte
 * démo : la bannière (et son bouton « Quitter la démo », qui aurait déconnecté
 * un utilisateur réel) suivait la session navigateur d'un compte à l'autre.
 *
 * Ces tests fixent les trois garde-fous : purge au logout, purge au login, et
 * non-partage de la prop pour un utilisateur non-démo.
 */
test.group('Demo session leak (#451)', (group) => {
  group.each.setup(() => truncateDb())

  test('a real user never receives the demo banner props, even with a stale session key', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()

    const response = await client
      .get('/dashboard')
      .loginAs(user)
      .withSession({ demoSessionStartedAt: Date.now() })
      .withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as {
      demoSessionStartedAt?: number
      demoSessionDurationMs?: number
    }
    assert.isUndefined(
      props.demoSessionStartedAt,
      'la bannière démo ne doit jamais être partagée à un compte réel'
    )
    assert.isUndefined(props.demoSessionDurationMs)
  })

  test('logout purges the demo session key so it does not follow the browser session', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()

    const response = await client
      .post('/logout')
      .loginAs(user)
      .withSession({ demoSessionStartedAt: Date.now() })
      .redirects(0)

    response.assertStatus(302)
    assert.isUndefined(response.session().demoSessionStartedAt)
  })

  test('login purges a demo session key left over by a previous demo session', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.with('organization', 1).create()

    const response = await client
      .post('/login')
      .withSession({ demoSessionStartedAt: Date.now() })
      .form({ email: user.email, password: 'Password123!' })
      .redirects(0)

    response.assertStatus(302)
    assert.isUndefined(response.session().demoSessionStartedAt)
  })
})
