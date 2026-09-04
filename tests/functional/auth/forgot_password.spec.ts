import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import PasswordResetToken from '#models/password_reset_token'
import { createAdminUser } from '#tests/functional/helpers'
import { DateTime } from 'luxon'

/**
 * #449 — le formulaire « mot de passe oublié » soumettait en GET
 * (`<Form route="password.forgot">` désignait la route GET) : l'email partait en
 * query string, la route POST n'était jamais atteinte et aucun email n'était
 * envoyé. Ces tests fixent le contrat des deux routes qui partagent le chemin
 * `/forgot-password` : le GET n'affiche que le formulaire, seul le POST émet un
 * token.
 */
test.group('Auth forgot password (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('POST /forgot-password issues a reset token and redirects back to the form', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()

    const response = await client.post('/forgot-password').form({ email: user.email }).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/forgot-password')

    const tokens = await PasswordResetToken.query().where('email', user.email)
    assert.lengthOf(tokens, 1)
  })

  test('GET /forgot-password with the email in the query string issues nothing (#449)', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()

    // Exactement ce que produisait le formulaire cassé : `/forgot-password?email=…`.
    const response = await client.get('/forgot-password').qs({ email: user.email })

    response.assertStatus(200)

    const tokens = await PasswordResetToken.query().where('email', user.email)
    assert.lengthOf(tokens, 0, 'la route GET ne doit jamais émettre de token de réinitialisation')
  })

  test('POST /forgot-password does not leak whether the email is known', async ({
    client,
    assert,
  }) => {
    const known = await createAdminUser()

    const knownResponse = await client
      .post('/forgot-password')
      .form({ email: known.email })
      .redirects(0)
    const unknownResponse = await client
      .post('/forgot-password')
      .form({ email: 'nobody@example.com' })
      .redirects(0)

    assert.equal(unknownResponse.status(), knownResponse.status())
    assert.equal(
      unknownResponse.header('location'),
      knownResponse.header('location'),
      'une adresse inconnue doit être indiscernable d’une adresse connue'
    )

    const tokens = await PasswordResetToken.query().where('email', 'nobody@example.com')
    assert.lengthOf(tokens, 0)
  })

  test('POST /forgot-password rejects a malformed email without issuing a token', async ({
    client,
    assert,
  }) => {
    const response = await client.post('/forgot-password').form({ email: 'not-an-email' })

    assert.notInclude(response.redirects().join(' '), '/dashboard')
    assert.lengthOf(await PasswordResetToken.all(), 0)
  })

  test('a second request replaces the previous token instead of stacking one', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()

    await client.post('/forgot-password').form({ email: user.email })
    const first = await PasswordResetToken.findByOrFail('email', user.email)

    await client.post('/forgot-password').form({ email: user.email })
    const tokens = await PasswordResetToken.query().where('email', user.email)

    assert.lengthOf(tokens, 1)
    assert.notEqual(tokens[0].token, first.token)
    assert.isTrue(tokens[0].expiresAt > DateTime.now())
  })
})
