import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import EmailVerificationToken from '#models/email_verification_token'
import User from '#models/user'
import EmailVerificationService from '#services/email_verification_service'
import { createAdminUser } from '#tests/functional/helpers'
import { EMAIL_VERIFICATION_TOKEN_TTL_HOURS } from '#shared/constants/email_verification'

/**
 * Vérification de l'adresse e-mail (#768).
 *
 * L'inscription créait directement un utilisateur, une organisation et une
 * session : rien ne prouvait que l'adresse saisie appartenait à la personne
 * qui s'inscrivait. Or cette adresse est le pivot de l'app — clé de connexion,
 * canal de réinitialisation, cible des invitations, destinataire des factures.
 *
 * Le parti pris de la garde est le vrai choix de cette issue : **l'app reste
 * accessible**, seules les actions qui engagent un tiers ou de l'argent
 * attendent la vérification. Une vérification qui ne garde rien est
 * décorative ; une vérification qui garde tout chasse l'utilisateur avant
 * qu'il ait vu le produit. Ces tests figent ce compromis dans les deux sens.
 */

/** Un compte fraîchement inscrit : non vérifié, comme après `POST /signup`. */
async function createUnverifiedUser() {
  const user = await createAdminUser('pro')
  user.emailVerifiedAt = null
  await user.save()
  return user
}

async function issueToken(email: string): Promise<string> {
  const service = await app.container.make(EmailVerificationService)
  const token = await service.createToken(email)
  return token!
}

test.group("Vérification d'adresse e-mail (#768)", (group) => {
  group.each.setup(() => truncateDb())

  test("l'inscription laisse le compte non vérifié et émet un jeton", async ({
    assert,
    client,
  }) => {
    const response = await client
      .post('/signup')
      .form({
        firstName: 'Marin',
        lastName: 'Test',
        email: 'marin@verify.test',
        password: 'Password123!',
        organizationName: 'Flotte de test',
        acceptTerms: 'on',
      })
      .redirects(0)

    response.assertStatus(302)

    const user = await User.findByOrFail('email', 'marin@verify.test')
    // Non vérifié, mais **connecté** : l'essai immédiat n'est pas cassé.
    assert.isNull(user.emailVerifiedAt)
    assert.notEqual(response.headers().location, '/login')

    const tokens = await EmailVerificationToken.query().where('email', user.email)
    assert.lengthOf(tokens, 1)
    // Le jeton stocké est un hash SHA-256, pas la valeur envoyée.
    assert.match(tokens[0].token, /^[0-9a-f]{64}$/)

    const ttl = tokens[0].expiresAt.diff(DateTime.now(), 'hours').hours
    assert.closeTo(ttl, EMAIL_VERIFICATION_TOKEN_TTL_HOURS, 1)
  })

  test('un lien valide vérifie le compte et se consomme', async ({ assert, client }) => {
    const user = await createUnverifiedUser()
    const token = await issueToken(user.email)

    const response = await client.get(`/verify-email/confirm?token=${token}`).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
    response.assertFlashMessage('success', 'Your email address is confirmed. You can sign in.')

    await user.refresh()
    assert.isNotNull(user.emailVerifiedAt)

    // Un jeton ne sert qu'une fois : rejouer le même lien ne trouve plus rien.
    assert.lengthOf(await EmailVerificationToken.query().where('email', user.email), 0)

    const replayed = await client.get(`/verify-email/confirm?token=${token}`).redirects(0)
    replayed.assertFlashMessage(
      'error',
      'This confirmation link is invalid or has expired. Sign in and request a new one.'
    )
  })

  test('un lien expiré est refusé et ne vérifie rien', async ({ assert, client }) => {
    const user = await createUnverifiedUser()
    const token = await issueToken(user.email)

    await EmailVerificationToken.query()
      .where('email', user.email)
      .update({ expires_at: DateTime.now().minus({ minutes: 1 }).toSQL() })

    const response = await client.get(`/verify-email/confirm?token=${token}`).redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'This confirmation link is invalid or has expired. Sign in and request a new one.'
    )

    await user.refresh()
    assert.isNull(user.emailVerifiedAt)
  })

  test('un jeton inconnu est refusé sans révéler quoi que ce soit', async ({ client }) => {
    const response = await client.get('/verify-email/confirm?token=nexistepas').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
    response.assertFlashMessage(
      'error',
      'This confirmation link is invalid or has expired. Sign in and request a new one.'
    )
  })

  test('le lien se consomme sans session ouverte', async ({ assert, client }) => {
    // Le lien arrive par e-mail : rien ne dit que la session est encore
    // ouverte dans le navigateur qui l'ouvre. Exiger d'être connecté
    // renverrait sur `/login` **en perdant le jeton** — le piège de #770.
    const user = await createUnverifiedUser()
    const token = await issueToken(user.email)

    const response = await client.get(`/verify-email/confirm?token=${token}`).redirects(0)

    response.assertStatus(302)
    await user.refresh()
    assert.isNotNull(user.emailVerifiedAt)
  })

  test('un renvoi invalide le lien précédent', async ({ assert, client }) => {
    const user = await createUnverifiedUser()
    const firstToken = await issueToken(user.email)

    const resend = await client.post('/verify-email/resend').loginAs(user).redirects(0)
    resend.assertStatus(302)

    const tokens = await EmailVerificationToken.query().where('email', user.email)
    assert.lengthOf(tokens, 1, 'un seul jeton en vol à la fois')

    // L'ancien lien ne marche plus : c'est ce qui rend le renvoi sûr.
    const replayed = await client.get(`/verify-email/confirm?token=${firstToken}`).redirects(0)
    replayed.assertFlashMessage(
      'error',
      'This confirmation link is invalid or has expired. Sign in and request a new one.'
    )
    await user.refresh()
    assert.isNull(user.emailVerifiedAt)
  })

  test('le renvoi ne distingue pas une adresse déjà vérifiée', async ({ assert, client }) => {
    const user = await createAdminUser('pro')
    assert.isNotNull(user.emailVerifiedAt, 'les comptes de fabrique sont vérifiés')

    const response = await client.post('/verify-email/resend').loginAs(user).redirects(0)

    response.assertStatus(302)
    // Même message que pour une adresse en attente : rien à distinguer.
    response.assertFlashMessage(
      'success',
      'If that address still needs confirming, a link is on its way.'
    )
    assert.lengthOf(await EmailVerificationToken.query().where('email', user.email), 0)
  })
})

test.group("Vérification d'adresse — la garde (#768)", (group) => {
  group.each.setup(() => truncateDb())

  test('un compte non vérifié ne peut pas inviter', async ({ assert, client }) => {
    const user = await createUnverifiedUser()

    const response = await client
      .post('/organization/invitations')
      .loginAs(user)
      .form({ email: 'invite@verify.test', role: 'member' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'Confirm your email address before doing this — it involves someone else or a payment.'
    )
    // Rien n'a été écrit : le refus tombe avant le contrôleur.
    const { default: OrganizationInvitation } = await import('#models/organization_invitation')
    assert.lengthOf(await OrganizationInvitation.all(), 0)
  })

  test('un compte non vérifié ne peut pas passer au paiement', async ({ client }) => {
    const user = await createUnverifiedUser()

    const response = await client
      .post('/settings/billing/checkout')
      .loginAs(user)
      .form({ plan: 'pro' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'Confirm your email address before doing this — it involves someone else or a payment.'
    )
  })

  test("une fois vérifié, l'invitation repasse", async ({ assert, client }) => {
    const user = await createUnverifiedUser()
    const token = await issueToken(user.email)
    await client.get(`/verify-email/confirm?token=${token}`).redirects(0)

    await user.refresh()
    assert.isNotNull(user.emailVerifiedAt)

    const response = await client
      .post('/organization/invitations')
      .loginAs(user)
      .form({ email: 'invite2@verify.test', role: 'member' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')
  })

  test("le reste de l'app reste ouvert sans vérification", async ({ client }) => {
    // C'est l'autre moitié du compromis : bloquer toute l'app casserait
    // l'essai immédiat, et c'est précisément ce que l'inscription sans
    // friction cherche à offrir.
    const user = await createUnverifiedUser()

    for (const path of ['/dashboard', '/boats', '/settings/me']) {
      const response = await client.get(path).loginAs(user).withInertia()
      response.assertStatus(200)
    }
  })
})
