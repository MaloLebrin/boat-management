import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser } from '#tests/functional/helpers'
import { LOGIN_ACCOUNT_LIMIT } from '#start/limiter'

/**
 * Bornage de la connexion **par compte** (#767).
 *
 * `authThrottle` était le seul limiteur du fichier à ne pas déclarer de clé :
 * il retombait donc sur l'IP. Toutes les tentatives d'un attaquant depuis une
 * IP étaient comptées ensemble, mais **rien ne comptait les tentatives contre
 * un compte**. 10/min/IP, mais depuis 200 IP résidentielles cela fait 2 000
 * tentatives/minute sur la même adresse — exactement le modèle d'attaque que
 * le bornage par IP ne couvre pas.
 *
 * Le second défaut était un budget partagé : les trois POST d'authentification
 * puisaient dans le même compteur, donc se tromper plusieurs fois de mot de
 * passe consommait le budget qui aurait permis de demander un lien de
 * réinitialisation — c'est-à-dire de se sortir d'affaire.
 */

const PASSWORD = 'Password123!'
const ACCOUNT_LIMIT = LOGIN_ACCOUNT_LIMIT.requests

/**
 * Chaque requête part d'une IP distincte.
 *
 * Sans ça, le compteur **par IP** (10/min) se déclencherait le premier et ces
 * tests prouveraient le mauvais mécanisme. C'est aussi le scénario réel : le
 * credential stuffing distribué est précisément ce que le bornage par IP ne
 * couvre pas.
 */
let ipCounter = 0
function fromNewIp(client: import('@japa/api-client').ApiClient, path: string) {
  ipCounter += 1
  const block = Math.floor(ipCounter / 250) + 1
  return client.post(path).header('x-forwarded-for', `203.0.113.${block}.${ipCounter % 250}`)
}

function failedLogin(client: import('@japa/api-client').ApiClient, email: string) {
  return fromNewIp(client, '/login').form({ email, password: 'MauvaisMotDePasse1!' }).redirects(0)
}

function signIn(client: import('@japa/api-client').ApiClient, email: string) {
  return fromNewIp(client, '/login').form({ email, password: PASSWORD }).redirects(0)
}

test.group('Login per-account throttle (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('the account counter blocks even when the IP changes', async ({ client, assert }) => {
    const user = await createAdminUser()

    for (let index = 0; index < ACCOUNT_LIMIT; index += 1) {
      await failedLogin(client, user.email)
    }

    const refused = await signIn(client, user.email)

    refused.assertStatus(302)
    // Le bon mot de passe ne passe plus : au-delà du plafond, les identifiants
    // ne sont même plus vérifiés.
    assert.notEqual(refused.header('location'), '/dashboard')
  })

  test('the counter is case-insensitive on the email', async ({ client, assert }) => {
    // Sans normalisation, changer la casse suffirait à repartir d'un compteur
    // vierge — `User.normalizeEmail` met déjà l'adresse en minuscules côté
    // modèle.
    const user = await createAdminUser()

    for (let index = 0; index < ACCOUNT_LIMIT; index += 1) {
      await failedLogin(client, user.email.toUpperCase())
    }

    const refused = await signIn(client, user.email)

    assert.notEqual(refused.header('location'), '/dashboard')
  })

  test('a successful login resets the counter', async ({ client, assert }) => {
    // `penalize` ne décompte que les échecs et remet le compteur à zéro sur
    // un succès : un utilisateur qui se trompe quelques fois puis y arrive ne
    // doit pas traîner un compteur à moitié plein.
    const user = await createAdminUser()

    for (let index = 0; index < ACCOUNT_LIMIT - 1; index += 1) {
      await failedLogin(client, user.email)
    }

    const success = await signIn(client, user.email)
    assert.equal(success.header('location'), '/dashboard')

    for (let index = 0; index < ACCOUNT_LIMIT - 1; index += 1) {
      await failedLogin(client, user.email)
    }

    const stillAllowed = await signIn(client, user.email)

    assert.equal(stillAllowed.header('location'), '/dashboard')
  })

  test('one account being blocked does not block another', async ({ client, assert }) => {
    // Le témoin : un compteur posé sur la mauvaise clé fermerait tout le
    // monde d'un coup.
    const victim = await createAdminUser()
    const bystander = await createAdminUser()

    for (let index = 0; index <= ACCOUNT_LIMIT; index += 1) {
      await failedLogin(client, victim.email)
    }

    const other = await signIn(client, bystander.email)

    assert.equal(other.header('location'), '/dashboard')
  })

  test('the refusal reads the same as any other failed sign-in', async ({ client }) => {
    // Le message ne doit pas dire d'où vient le blocage — IP ou compte —
    // sinon le refus devient un signal sur l'activité visant ce compte.
    const user = await createAdminUser()

    for (let index = 0; index <= ACCOUNT_LIMIT; index += 1) {
      await failedLogin(client, user.email)
    }

    const refused = await failedLogin(client, user.email)

    refused.assertStatus(302)
    refused.assertFlashMessage('error', 'Too many sign-in attempts. Please try again later.')
  })

  test('a failed sign-in no longer eats the password-reset budget', async ({ client }) => {
    // Les trois POST partageaient un compteur : se tromper de mot de passe
    // fermait la porte de secours.
    const user = await createAdminUser()

    for (let index = 0; index < ACCOUNT_LIMIT; index += 1) {
      await failedLogin(client, user.email)
    }

    const forgot = await fromNewIp(client, '/forgot-password')
      .form({ email: user.email })
      .redirects(0)

    forgot.assertStatus(302)
    forgot.assertFlashMessage(
      'success',
      'If this email is associated with an account, you will receive a reset link.'
    )
  })
})
