import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { assertPageContract } from '#tests/support/inertia_page'
import { createAdminUser } from '#tests/functional/helpers'

/**
 * Contrat des pages d'authentification (#689).
 *
 * Les quatre premières sont les seules du dépôt à être servies **sans
 * session**, et c'est ce qui les rend particulières : toutes les autres pages
 * sont des cibles de redirection potentielles vers `auth/login`. Les épingler
 * ici, c'est fixer le point d'arrivée de ce piège.
 *
 * `auth/verify_email` (#768) fait exception : elle demande une session, mais sa
 * place est ici — c'est le même domaine, et le flux dont elle fait partie finit
 * justement sur `auth/login`.
 *
 * `auth/login` et `auth/forgot_password` ne déclarent aucun `defineProps` — le
 * contrôleur leur passe `{}`. Leur contrat se réduit au composant, et c'est
 * exact, pas un raccourci.
 */

test.group('Auth pages contract (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('GET /login renders auth/login', async ({ client, assert }) => {
    assertPageContract(assert, await client.get('/login').withInertia(), 'auth/login')
  })

  test('GET /signup renders auth/signup', async ({ client, assert }) => {
    assertPageContract(assert, await client.get('/signup').withInertia(), 'auth/signup')
  })

  test('GET /forgot-password renders auth/forgot_password', async ({ client, assert }) => {
    assertPageContract(
      assert,
      await client.get('/forgot-password').withInertia(),
      'auth/forgot_password'
    )
  })

  test('GET /reset-password renders auth/reset_password with the token', async ({
    client,
    assert,
  }) => {
    // La page ne s'atteint qu'avec un jeton en query : sans lui le contrôleur
    // rend quand même la page, avec un token vide. On passe le cas nominal.
    const response = await client.get('/reset-password?token=some-token').withInertia()

    assertPageContract(assert, response, 'auth/reset_password')
  })

  test('GET /verify-email renders auth/verify_email', async ({ client, assert }) => {
    const user = await createAdminUser('pro')

    assertPageContract(
      assert,
      await client.get('/verify-email').loginAs(user).withInertia(),
      'auth/verify_email'
    )
  })
})
