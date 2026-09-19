import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import app from '@adonisjs/core/services/app'
import PasswordResetService from '#services/password_reset_service'
import User from '#models/user'
import { createAdminUser } from '#tests/functional/helpers'
import type { ApiClient } from '@japa/api-client'

/**
 * La réinitialisation du mot de passe coupe les accès existants (#763).
 *
 * Un utilisateur qui pense son compte compromis change son mot de passe.
 * C'est l'action qu'on attend de lui, et c'est celle que la page « mot de
 * passe oublié » lui propose. Elle ne révoquait rien : l'attaquant déjà
 * connecté le restait.
 *
 * Deux accès survivaient :
 *
 * 1. **les sessions ouvertes** — `config/session.ts` donne `age: '5d'` et
 *    `clearWithBrowser: false`, donc jusqu'à cinq jours ;
 * 2. **les remember-me tokens** — `rememberMeTokensAge: '30d'`, et c'est le
 *    pire des deux : le cookie seul suffit à se réauthentifier, le mot de
 *    passe ne sert plus à rien.
 *
 * Autrement dit : la victime changeait son mot de passe, voyait un message de
 * succès, et l'attaquant restait connecté un mois.
 */

const ORIGINAL_PASSWORD = 'Password123!'
const NEW_PASSWORD = 'NouveauMdp2026!'

async function requestToken(user: User) {
  const service = await app.container.make(PasswordResetService)
  return (await service.createToken(user.email))!
}

async function resetPassword(client: ApiClient, token: string) {
  return client
    .post('/reset-password')
    .form({ token, password: NEW_PASSWORD, passwordConfirmation: NEW_PASSWORD })
    .redirects(0)
}

/**
 * ⚠️ Suivre **la même** session de part et d'autre d'une réinitialisation
 * n'est pas faisable ici : le plugin api-client de Japa isole le magasin de
 * sessions par requête, et rejouer le cookie `adonis-session` ne ressuscite
 * pas la session (vérifié). C'est donc
 * `tests/unit/middleware/revoked_session_middleware.spec.ts` qui prouve la
 * comparaison estampille / `sessionsValidAfter`, y compris le cas limite de
 * l'égalité dont dépend le changement de mot de passe depuis les réglages.
 *
 * Ce fichier couvre ce qui est observable de bout en bout : les remember-me
 * supprimés, `sessionsValidAfter` posé, une session non estampillée refusée,
 * et les deux témoins.
 */
test.group('Password reset revokes access (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('a session with no stamp is refused once the account has revoked', async ({
    client,
    assert,
  }) => {
    // Échec fermé : les sessions déjà ouvertes au déploiement n'ont pas
    // d'estampille, et doivent être traitées comme antérieures à la
    // révocation.
    const user = await createAdminUser()

    const token = await requestToken(user)
    await resetPassword(client, token)

    const response = await client.get('/dashboard').loginAs(user).withInertia().redirects(0)

    assert.equal(response.status(), 302)
    assert.equal(response.header('location'), '/login')
  })

  test('the reset deletes every remember-me token of the account', async ({ client, assert }) => {
    const user = await createAdminUser()

    await client
      .post('/login')
      .form({ email: user.email, password: ORIGINAL_PASSWORD, remember: true })
      .redirects(0)

    const issued = await User.rememberMeTokens.all(user)
    assert.isAbove(issued.length, 0, 'le scénario exige un remember-me token à révoquer')

    const token = await requestToken(user)
    await resetPassword(client, token)

    assert.lengthOf(
      await User.rememberMeTokens.all(user),
      0,
      'un cookie remember-me survivant permet de se réauthentifier sans le mot de passe'
    )
  })

  test('the reset stamps sessionsValidAfter', async ({ client, assert }) => {
    const user = await createAdminUser()
    await user.refresh()
    assert.isNull(user.sessionsValidAfter, 'aucun compte ne doit être révoqué par défaut')

    const token = await requestToken(user)
    await resetPassword(client, token)

    await user.refresh()
    assert.isNotNull(user.sessionsValidAfter)
  })

  test('a fresh sign-in after the reset works normally', async ({ client, assert }) => {
    // Le témoin : révoquer ne doit pas fermer la porte pour de bon.
    const user = await createAdminUser()
    const token = await requestToken(user)
    await resetPassword(client, token)

    const login = await client
      .post('/login')
      .form({ email: user.email, password: NEW_PASSWORD })
      .redirects(0)

    // La connexion réussit et pose son estampille, postérieure à la
    // révocation. C'est le cas que cassait un premier jet du correctif, où
    // l'estampille était posée paresseusement par le middleware : la session
    // légitime née d'une réinitialisation se faisait couper dès sa première
    // requête. D'où `stampAuthSession()` sur les trois points d'entrée.
    assert.equal(login.header('location'), '/dashboard')
  })

  test('another account keeps its session', async ({ client, assert }) => {
    // Le second témoin : une révocation posée sur la mauvaise clé
    // déconnecterait tout le monde.
    const victim = await createAdminUser()
    const bystander = await createAdminUser()

    await client.get('/dashboard').loginAs(bystander).withInertia().redirects(0)

    const token = await requestToken(victim)
    await resetPassword(client, token)

    const response = await client.get('/dashboard').loginAs(bystander).withInertia().redirects(0)

    assert.equal(response.status(), 200)
  })

  test('changing the password from settings keeps the current session', async ({
    client,
    assert,
  }) => {
    // Le geste attendu déconnecte les autres appareils, pas celui qui agit.
    const user = await createAdminUser()

    const response = await client
      .put('/settings/password')
      .loginAs(user)
      .form({
        currentPassword: ORIGINAL_PASSWORD,
        password: NEW_PASSWORD,
        passwordConfirmation: NEW_PASSWORD,
      })
      .redirects(0)

    assert.notEqual(response.header('location'), '/login')

    await user.refresh()
    assert.isNotNull(user.sessionsValidAfter, 'les autres appareils doivent être révoqués')
  })
})
