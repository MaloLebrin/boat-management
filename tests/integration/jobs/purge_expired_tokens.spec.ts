import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import PasswordResetToken from '#models/password_reset_token'
import OrganizationInvitation from '#models/organization_invitation'
import type Organization from '#models/organization'
import { OrganizationFactory } from '#database/factories/organization_factory'
import PurgeExpiredTokens from '#jobs/purge_expired_tokens'
import PasswordResetService from '#services/password_reset_service'
import OrganizationInvitationService from '#services/organization_invitation_service'
import { EXPIRED_TOKEN_GRACE_DAYS } from '#shared/constants/data_retention'

/**
 * Purge des jetons morts — cron quotidien 00:00 (#775).
 *
 * Un jeton de réinitialisation expiré et une invitation jamais acceptée n'ont
 * plus aucune utilité et gardent l'adresse e-mail de leur destinataire. Rien
 * ne les supprimait : `invalidateTokensForEmail` n'est appelée qu'à la
 * réémission ou à la consommation, et l'expiration d'une invitation n'est
 * qu'une date lue au moment de l'accepter.
 *
 * Deux façons de se tromper :
 *
 * - purger trop peu ⇒ des adresses e-mail conservées sans limite, pour des
 *   jetons qui ne servent plus ;
 * - purger trop ⇒ un lien encore valide cassé sous les pieds de son
 *   destinataire, ou l'historique de rattachement d'un membre effacé.
 *
 * Pas de `truncateDb()` : la suite `integration` enveloppe tous ses tests dans
 * une transaction globale (`tests/bootstrap.ts`), annulée à la fin. Un
 * TRUNCATE par-dessus attendrait la fin de cette transaction et se bloquerait.
 * Chaque test préfixe donc ses adresses et n'assertre que sur les siennes.
 */

/** Un jeton de reset dont l'expiration tombe il y a `daysAgo` jours. */
async function seedResetToken(email: string, expiredDaysAgo: number) {
  return PasswordResetToken.create({
    email,
    token: randomUUID().replace(/-/g, '').repeat(2),
    expiresAt: DateTime.now().minus({ days: expiredDaysAgo }),
  })
}

async function remainingResetEmails(prefix: string): Promise<string[]> {
  const rows = await PasswordResetToken.query()
    .where('email', 'like', `${prefix}%`)
    .orderBy('email')
  return rows.map((row) => row.email)
}

async function seedOrganization(): Promise<Organization> {
  return OrganizationFactory.merge({ plan: 'pro' }).create()
}

async function seedInvitation(
  organizationId: number,
  email: string,
  expiredDaysAgo: number,
  status: 'pending' | 'accepted' | 'cancelled' = 'pending'
) {
  return OrganizationInvitation.create({
    organizationId,
    invitedById: null,
    email,
    role: 'member',
    token: randomUUID().replace(/-/g, '').repeat(2),
    status,
    expiresAt: DateTime.now().minus({ days: expiredDaysAgo }),
    acceptedAt: status === 'accepted' ? DateTime.now().minus({ days: expiredDaysAgo }) : null,
    boatIds: null,
  })
}

async function remainingInvitationEmails(prefix: string): Promise<string[]> {
  const rows = await OrganizationInvitation.query()
    .where('email', 'like', `${prefix}%`)
    .orderBy('email')
  return rows.map((row) => row.email)
}

test.group('PurgeExpiredTokens (cron 00:00)', () => {
  test('supprime les jetons de reset expirés au-delà du délai de grâce', async ({ assert }) => {
    // Encore valide : expire dans une heure.
    await PasswordResetToken.create({
      email: 'reset-window-live@purge.test',
      token: randomUUID().replace(/-/g, '').repeat(2),
      expiresAt: DateTime.now().plus({ hours: 1 }),
    })
    // Expiré, mais toujours dans la grâce.
    await seedResetToken('reset-window-grace@purge.test', EXPIRED_TOKEN_GRACE_DAYS - 1)
    // Expiré depuis plus longtemps que la grâce.
    await seedResetToken('reset-window-old@purge.test', EXPIRED_TOKEN_GRACE_DAYS + 1)

    // Par le job, et non par les services : un `execute()` vidé de son corps
    // laisserait les services au vert et le cron sans effet.
    const job = await app.container.make(PurgeExpiredTokens)
    await job.execute()

    assert.deepEqual(await remainingResetEmails('reset-window-'), [
      'reset-window-grace@purge.test',
      'reset-window-live@purge.test',
    ])
  })

  test('supprime les invitations expirées non acceptées, garde les acceptées', async ({
    assert,
  }) => {
    const org = await seedOrganization()

    await seedInvitation(org.id, 'invite-keep-live@purge.test', -3) // expire dans 3 jours
    await seedInvitation(org.id, 'invite-keep-grace@purge.test', EXPIRED_TOKEN_GRACE_DAYS - 1)
    await seedInvitation(org.id, 'invite-drop-pending@purge.test', EXPIRED_TOKEN_GRACE_DAYS + 1)
    await seedInvitation(org.id, 'invite-drop-cancelled@purge.test', 400, 'cancelled')
    // Une invitation acceptée dit qui a rejoint l'organisation, par qui et à
    // quel titre : elle survit quelle que soit sa date.
    await seedInvitation(org.id, 'invite-keep-accepted@purge.test', 400, 'accepted')

    const job = await app.container.make(PurgeExpiredTokens)
    await job.execute()

    assert.deepEqual(await remainingInvitationEmails('invite-'), [
      'invite-keep-accepted@purge.test',
      'invite-keep-grace@purge.test',
      'invite-keep-live@purge.test',
    ])
  })

  test('remonte le nombre de lignes supprimées et reste idempotent', async ({ assert }) => {
    const passwordResetService = await app.container.make(PasswordResetService)
    const invitationService = await app.container.make(OrganizationInvitationService)

    // Point de départ net : les tests précédents partagent la transaction
    // globale de la suite, leurs lignes sont encore là.
    await passwordResetService.purgeExpired()
    await invitationService.purgeExpired()

    await seedResetToken('reset-count-a@purge.test', EXPIRED_TOKEN_GRACE_DAYS + 5)
    await seedResetToken('reset-count-b@purge.test', EXPIRED_TOKEN_GRACE_DAYS + 90)
    await seedResetToken('reset-count-fresh@purge.test', EXPIRED_TOKEN_GRACE_DAYS - 1)

    const org = await seedOrganization()
    await seedInvitation(org.id, 'count-invite-a@purge.test', EXPIRED_TOKEN_GRACE_DAYS + 5)

    // Le compte remonte dans le log du job : une purge silencieuse ne se
    // distingue pas d'une purge qui ne tourne plus.
    assert.equal(await passwordResetService.purgeExpired(), 2)
    assert.equal(await invitationService.purgeExpired(), 1)

    assert.deepEqual(await remainingResetEmails('reset-count-'), ['reset-count-fresh@purge.test'])

    // Repasser ne supprime rien de plus.
    assert.equal(await passwordResetService.purgeExpired(), 0)
    assert.equal(await invitationService.purgeExpired(), 0)
  })
})
