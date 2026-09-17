import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import PasswordResetToken from '#models/password_reset_token'
import PasswordResetService from '#services/password_reset_service'
import { createAdminUser } from '#tests/functional/helpers'
import { assertPageContract } from '#tests/support/inertia_page'
import type { ApiClient } from '@japa/api-client'
import type User from '#models/user'

/**
 * Consommation du jeton de réinitialisation (#691).
 *
 * `forgot_password.spec.ts` couvrait la **demande** ; les deux routes qui
 * **consomment** le jeton n'étaient atteintes par aucun test. C'est la moitié du
 * parcours qui compte : celle où un lien reçu par e-mail donne le droit de
 * changer un mot de passe.
 *
 * ⚠️ Ces tests ont trouvé un bug de production, corrigé dans la même PR :
 * `updatePassword` pré-hachait le mot de passe avant `save()`, et le hook
 * `beforeSave` de `withAuthFinder` le hachait **une seconde fois**. Après une
 * réinitialisation, ni l'ancien ni le nouveau mot de passe ne fonctionnaient —
 * l'utilisateur était enfermé dehors, définitivement, puisqu'un nouveau lien
 * reproduisait le même effet.
 *
 * D'où le parti pris de ce fichier : **on rejoue une vraie connexion** plutôt
 * que de comparer des hashs. Une assertion sur le hash stocké aurait pu passer
 * au vert (« le hash a bien changé ») sur un mot de passe pourtant inutilisable.
 * Seule la connexion prouve ce que l'utilisateur vit.
 */

const ORIGINAL_PASSWORD = 'Password123!'
const NEW_PASSWORD = 'NouveauMdp2026!'

async function requestToken(user: User) {
  const service = await app.container.make(PasswordResetService)
  const token = await service.createToken(user.email)
  return token!
}

function resetForm(token: string, password = NEW_PASSWORD) {
  return { token, password, passwordConfirmation: password }
}

/** `/dashboard` = connexion réussie ; toute autre destination = refus. */
async function loginLandsOnDashboard(client: ApiClient, user: User, password: string) {
  const response = await client.post('/login').form({ email: user.email, password }).redirects(0)

  return response.headers().location === '/dashboard'
}

test.group('Password reset — consuming the token (functional)', (group) => {
  group.each.setup(() => truncateDb())

  // --- le témoin ---

  test('the original password works before anything happens', async ({ client, assert }) => {
    // Sans ce témoin, les tests suivants ne distingueraient pas « le nouveau mot
    // de passe fonctionne » de « la connexion fonctionne toujours, quoi qu'on
    // envoie ».
    const user = await createAdminUser()

    assert.isTrue(await loginLandsOnDashboard(client, user, ORIGINAL_PASSWORD))
  })

  // --- GET : le formulaire ---

  test('GET /reset-password carries the token to the page', async ({ client, assert }) => {
    const user = await createAdminUser()
    const token = await requestToken(user)

    const response = await client.get(`/reset-password?token=${token}`).withInertia()

    assertPageContract(assert, response, 'auth/reset_password')
    assert.equal((response.inertiaProps as { token: string }).token, token)
  })

  test('GET /reset-password without a token renders an empty one', async ({ client, assert }) => {
    // Comportement actuel : le contrôleur rend la page avec `token: ''` plutôt
    // que de rediriger. Le refus vient donc du POST, pas du GET — figé pour que
    // déplacer cette garde soit un choix visible.
    const response = await client.get('/reset-password').withInertia()

    assertPageContract(assert, response, 'auth/reset_password')
    assert.equal((response.inertiaProps as { token: string }).token, '')
  })

  // --- POST : le cœur du sujet ---

  test('a valid token lets the user sign in with the new password', async ({ client, assert }) => {
    const user = await createAdminUser()
    const token = await requestToken(user)

    const response = await client.post('/reset-password').form(resetForm(token)).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
    assert.isTrue(
      await loginLandsOnDashboard(client, user, NEW_PASSWORD),
      'le nouveau mot de passe doit permettre de se connecter'
    )
  })

  test('the old password stops working after a reset', async ({ client, assert }) => {
    const user = await createAdminUser()
    const token = await requestToken(user)

    await client.post('/reset-password').form(resetForm(token)).redirects(0)

    assert.isFalse(await loginLandsOnDashboard(client, user, ORIGINAL_PASSWORD))
  })

  test('the token is single-use — replaying it changes nothing', async ({ client, assert }) => {
    // La propriété la plus importante du fichier. Sans elle, un lien intercepté
    // reste utilisable indéfiniment, bien après que son destinataire s'en soit
    // servi.
    const user = await createAdminUser()
    const token = await requestToken(user)

    await client.post('/reset-password').form(resetForm(token)).redirects(0)
    await client.post('/reset-password').form(resetForm(token, 'EncoreUnAutre1!')).redirects(0)

    assert.isTrue(
      await loginLandsOnDashboard(client, user, NEW_PASSWORD),
      'le rejeu du jeton ne doit pas avoir imposé un troisième mot de passe'
    )
    assert.lengthOf(await PasswordResetToken.query().where('email', user.email), 0)
  })

  test('an expired token is refused', async ({ client, assert }) => {
    const user = await createAdminUser()
    const token = await requestToken(user)
    await PasswordResetToken.query()
      .where('email', user.email)
      .update({ expires_at: DateTime.now().minus({ minutes: 1 }).toSQL({ includeOffset: false }) })

    await client.post('/reset-password').form(resetForm(token)).redirects(0)

    assert.isTrue(
      await loginLandsOnDashboard(client, user, ORIGINAL_PASSWORD),
      'un jeton expiré ne doit rien changer'
    )
  })

  test('an unknown token is refused', async ({ client, assert }) => {
    const user = await createAdminUser()
    await requestToken(user)

    await client
      .post('/reset-password')
      .form(resetForm('f'.repeat(128)))
      .redirects(0)

    assert.isTrue(await loginLandsOnDashboard(client, user, ORIGINAL_PASSWORD))
  })

  test('asking for a second link kills the first', async ({ client, assert }) => {
    // `createToken` supprime les jetons existants de l'adresse. Sans ça, chaque
    // demande laisserait un lien valide de plus dans la nature pendant une heure.
    const user = await createAdminUser()
    const first = await requestToken(user)
    await requestToken(user)

    await client.post('/reset-password').form(resetForm(first)).redirects(0)

    assert.isTrue(
      await loginLandsOnDashboard(client, user, ORIGINAL_PASSWORD),
      'le premier lien doit être mort dès la seconde demande'
    )
  })

  test('a signed-in visitor is turned away by the guest middleware', async ({ client }) => {
    const user = await createAdminUser()
    const token = await requestToken(user)

    const response = await client
      .get(`/reset-password?token=${token}`)
      .loginAs(user)
      .withInertia()
      .redirects(0)

    response.assertStatus(302)
    // `redirect('/dashboard', true)` conserve la query string : la redirection
    // emporte donc le jeton. Sans conséquence — la page de destination l'ignore —
    // mais c'est ce que fait le code, et le figer évite une fausse alerte.
    response.assertHeader('location', `/dashboard?token=${token}`)
  })
})
