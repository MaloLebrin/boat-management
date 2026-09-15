import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { DateTime } from 'luxon'
import { BoatFactory } from '#database/factories/boat_factory'
import { CrewMemberFactory } from '#database/factories/crew_member_factory'
import { NavigationLogFactory } from '#database/factories/navigation_log_factory'
import { createAdminUser, createBoatOwnerUser } from '#tests/functional/helpers'

/**
 * Tests de caractérisation de `CrewRolePdfController` (vague 0.4) : le rôle
 * d'équipage d'une sortie, exporté en PDF.
 */

async function logWithCrew() {
  const admin = await createAdminUser()
  const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
  const log = await NavigationLogFactory.merge({
    boatId: boat.id,
    organizationId: boat.organizationId,
    departedAt: DateTime.fromISO('2026-07-14T08:30:00', { zone: 'utc' }),
    departurePortName: 'Marseille',
    arrivalPortName: 'Cassis',
  }).create()
  const skipper = await CrewMemberFactory.merge({
    organizationId: admin.organizationId!,
    firstName: 'Alice',
    lastName: 'Dupont',
  }).create()
  await log.related('crew').attach({ [skipper.id]: { role: 'skipper' } })
  return { admin, boat, log, skipper }
}

test.group('Rôle d’équipage PDF — GET …/navigation-logs/:logId/crew-role.pdf', (group) => {
  group.each.setup(() => truncateDb())

  test('redirige vers /login sans authentification', async ({ client }) => {
    const response = await client.get('/boats/1/navigation-logs/1/crew-role.pdf').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('un admin télécharge un PDF nommé d’après la date de départ', async ({ client, assert }) => {
    const { admin, boat, log } = await logWithCrew()

    const response = await client
      .get(`/boats/${boat.id}/navigation-logs/${log.id}/crew-role.pdf`)
      .loginAs(admin)

    response.assertStatus(200)
    response.assertHeader('content-type', 'application/pdf')
    response.assertHeader(
      'content-disposition',
      'attachment; filename="role-equipage-2026-07-14.pdf"'
    )
    // Le corps binaire n'est pas exposé par le client d'API : la taille suffit
    // à distinguer un vrai document d'une réponse vide.
    assert.isAbove(Number(response.header('content-length')), 500)
  })

  test("la sortie d'un autre bateau renvoie vers l'onglet journal", async ({ client }) => {
    const { admin, boat } = await logWithCrew()
    const otherBoat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const foreignLog = await NavigationLogFactory.merge({
      boatId: otherBoat.id,
      organizationId: otherBoat.organizationId,
    }).create()

    const response = await client
      .get(`/boats/${boat.id}/navigation-logs/${foreignLog.id}/crew-role.pdf`)
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}?tab=navigation-logs`)
  })

  test("le bateau d'une autre organisation renvoie vers /boats", async ({ client }) => {
    const { boat, log } = await logWithCrew()
    const attacker = await createAdminUser()

    const response = await client
      .get(`/boats/${boat.id}/navigation-logs/${log.id}/crew-role.pdf`)
      .loginAs(attacker)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
  })

  test('un propriétaire (sans navigation_logs.update) est refusé', async ({ client }) => {
    const { admin, boat, log } = await logWithCrew()
    const owner = await createBoatOwnerUser(admin.organizationId!)
    await boat.related('owners').attach([owner.id])

    const response = await client
      .get(`/boats/${boat.id}/navigation-logs/${log.id}/crew-role.pdf`)
      .loginAs(owner)

    response.assertStatus(403)
  })
})
