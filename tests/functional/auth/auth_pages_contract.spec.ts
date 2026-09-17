import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { assertPageContract } from '#tests/support/inertia_page'

/**
 * Contrat des pages d'authentification (#689).
 *
 * Ces quatre pages sont les seules du dépôt à être servies **sans session**, et
 * c'est ce qui les rend particulières : toutes les autres pages sont des cibles
 * de redirection potentielles vers `auth/login`. Les épingler ici, c'est fixer
 * le point d'arrivée de ce piège.
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
})
