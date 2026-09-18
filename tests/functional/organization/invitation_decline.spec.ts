import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import OrganizationInvitation from '#models/organization_invitation'
import OrganizationInvitationService from '#services/organization_invitation_service'
import { createAdminUser } from '#tests/functional/helpers'
import type User from '#models/user'

/**
 * Refus d'invitation (#691).
 *
 * `POST /invitations/decline` est **publique** : elle n'exige aucune session,
 * seulement le jeton. C'est délibéré — on ne peut pas demander à quelqu'un de se
 * créer un compte pour refuser d'en rejoindre un — mais cela en fait une route
 * qui **change l'état** sans authentification, et elle n'avait aucun test.
 *
 * Ce qui compte ici : que le jeton soit la seule chose qui décide, qu'un jeton
 * invalide ne produise aucun effet de bord, et qu'un refus soit définitif.
 */

async function inviteSomeone(admin: User, email = 'invite@example.com') {
  const service = await app.container.make(OrganizationInvitationService)
  const { plainToken } = await service.create(admin.organizationId!, admin.id, email, 'member')
  return plainToken
}

async function invitationFor(email: string) {
  return OrganizationInvitation.findByOrFail('email', email)
}

async function statusFor(email: string) {
  const invitation = await invitationFor(email)
  return invitation.status
}

test.group('Invitation decline — public, token only (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('a valid token declines the invitation without any session', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const token = await inviteSomeone(admin)

    // Aucun `loginAs` : c'est tout l'objet de la route.
    const response = await client.post('/invitations/decline').form({ token }).redirects(0)

    response.assertStatus(302)
    assert.equal(await statusFor('invite@example.com'), 'cancelled')
  })

  test('an unknown token changes nothing', async ({ client, assert }) => {
    const admin = await createAdminUser()
    await inviteSomeone(admin)

    const response = await client
      .post('/invitations/decline')
      .form({ token: 'jeton-inexistant' })
      .redirects(0)

    response.assertStatus(302)
    assert.equal(
      await statusFor('invite@example.com'),
      'pending',
      'un jeton inconnu ne doit toucher aucune invitation'
    )
  })

  test('an expired token is refused and leaves the invitation alone', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const token = await inviteSomeone(admin)
    const invitation = await invitationFor('invite@example.com')
    invitation.expiresAt = DateTime.now().minus({ days: 1 })
    await invitation.save()

    await client.post('/invitations/decline').form({ token }).redirects(0)

    assert.equal(await statusFor('invite@example.com'), 'pending')
  })

  test('declining twice is refused the second time', async ({ client, assert }) => {
    // Après le premier refus l'invitation n'est plus `pending`, donc
    // `verifyToken` lève `InvitationAlreadyAcceptedError`. L'état reste
    // `cancelled` — un second refus ne doit pas le réécrire en boucle.
    const admin = await createAdminUser()
    const token = await inviteSomeone(admin)

    await client.post('/invitations/decline').form({ token }).redirects(0)
    const second = await client.post('/invitations/decline').form({ token }).redirects(0)

    second.assertStatus(302)
    assert.equal(await statusFor('invite@example.com'), 'cancelled')
  })

  test('a declined invitation can no longer be accepted', async ({ client, assert }) => {
    // La propriété qui compte vraiment : refuser ferme la porte. Si un jeton
    // refusé restait acceptable, le refus ne servirait à rien.
    const admin = await createAdminUser()
    const token = await inviteSomeone(admin)
    await client.post('/invitations/decline').form({ token }).redirects(0)

    const invitee = await createAdminUser()
    await client.post('/invitations/accept').form({ token }).loginAs(invitee).redirects(0)

    assert.equal(await statusFor('invite@example.com'), 'cancelled')
  })
})
