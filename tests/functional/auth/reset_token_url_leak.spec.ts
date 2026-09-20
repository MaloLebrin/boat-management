import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import app from '@adonisjs/core/services/app'
import PasswordResetService from '#services/password_reset_service'
import { createAdminUser } from '#tests/functional/helpers'
import { assertPageContract } from '#tests/support/inertia_page'
import type User from '#models/user'

/**
 * Le jeton de réinitialisation ne doit pas survivre dans une URL (#770).
 *
 * Le lien reçu par e-mail porte forcément le jeton en query string — c'est un
 * lien. Ce qui était en cause, c'est qu'il y **restait**, et qu'il s'y
 * propageait :
 *
 * - `config/app.ts` active `forwardQueryString: true` globalement, et
 *   `GuestMiddleware` le redemandait explicitement. Un utilisateur déjà
 *   connecté — cas banal, `config/session.ts` donne `age: '5d'` et
 *   `clearWithBrowser: false` — qui clique sur son lien atterrissait sur
 *   `/dashboard?token=<jeton encore valide>` ;
 * - de là, le jeton partait dans l'historique du navigateur, dans les journaux
 *   d'accès du reverse proxy, et dans le `Referer` des sous-requêtes de la
 *   page. La CSP autorise `res.cloudinary.com` en `imgSrc` : Cloudinary
 *   recevait donc l'URL complète dès l'affichage d'une photo de bateau.
 *
 * Le jeton reste utilisable jusqu'à son expiration (1 h) ou sa consommation :
 * qui lit ces journaux peut réinitialiser le mot de passe du compte.
 */

async function requestToken(user: User) {
  const service = await app.container.make(PasswordResetService)
  const token = await service.createToken(user.email)
  return token!
}

test.group('Reset token URL leak (functional)', (group) => {
  group.each.setup(() => truncateDb())

  // --- 1. la redirection du middleware `guest` ---

  test('the guest redirect drops the query string entirely', async ({ client, assert }) => {
    const user = await createAdminUser()
    const token = await requestToken(user)

    const response = await client
      .get(`/reset-password?token=${token}`)
      .loginAs(user)
      .withInertia()
      .redirects(0)

    response.assertStatus(302)
    const location = response.header('location') as string

    assert.equal(location, '/dashboard')
    assert.notInclude(location, token)
    assert.notInclude(location, '?')
  })

  // --- 2. le jeton sort de l'URL dès le GET ---

  test('a visitor arriving with ?token= is replayed without a query string', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const token = await requestToken(user)

    const response = await client.get(`/reset-password?token=${token}`).redirects(0)

    response.assertStatus(302)
    const location = response.header('location') as string

    assert.equal(location, '/reset-password')
    assert.notInclude(
      location,
      token,
      'le jeton ne doit traverser l’URL que le temps d’une requête'
    )
  })

  test('the replayed page still receives the token, from the session', async ({
    client,
    assert,
  }) => {
    // Le jeton n'est pas perdu : il passe par la session et redescend en prop,
    // donc dans le **corps** d'une réponse, pas dans une URL. Le formulaire
    // continue de le poster.
    const user = await createAdminUser()
    const token = await requestToken(user)

    const response = await client.get(`/reset-password?token=${token}`).withInertia().redirects(1)

    response.assertStatus(200)
    assertPageContract(assert, response, 'auth/reset_password')
    assert.equal((response.inertiaProps as { token: string }).token, token)
  })

  test('the form still resets the password end to end', async ({ client, assert }) => {
    // Le témoin : sortir le jeton de l'URL ne doit rien casser du parcours.
    const user = await createAdminUser()
    const token = await requestToken(user)

    await client.get(`/reset-password?token=${token}`).withInertia().redirects(1)

    const submitted = await client
      .post('/reset-password')
      .form({ token, password: 'NouveauMdp2026!', passwordConfirmation: 'NouveauMdp2026!' })
      .redirects(0)

    submitted.assertStatus(302)

    const login = await client
      .post('/login')
      .form({ email: user.email, password: 'NouveauMdp2026!' })
      .redirects(0)

    assert.equal(login.header('location'), '/dashboard')
  })

  test('a visitor with no token at all still gets the page', async ({ client, assert }) => {
    // Pas de boucle de redirection quand il n'y a rien à échanger.
    const response = await client.get('/reset-password').withInertia()

    response.assertStatus(200)
    assertPageContract(assert, response, 'auth/reset_password')
    assert.equal((response.inertiaProps as { token: string }).token, '')
  })

  // --- 3. la défense indépendante : Referrer-Policy ---

  test('every response carries a Referrer-Policy header', async ({ client }) => {
    // Coupe la fuite vers Cloudinary pour tous les cas analogues, présents et
    // futurs — y compris les jetons d'invitation, qui circulent aussi en query
    // string. Posé par un middleware serveur et non par Shield, que le kernel
    // retire en test.
    const response = await client.get('/login').withInertia()

    response.assertHeader('referrer-policy', 'strict-origin-when-cross-origin')
  })

  test('the header is there on an authenticated page too', async ({ client }) => {
    const user = await createAdminUser()

    const response = await client.get('/dashboard').loginAs(user).withInertia()

    response.assertHeader('referrer-policy', 'strict-origin-when-cross-origin')
  })
})
