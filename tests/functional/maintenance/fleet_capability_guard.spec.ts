import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatMaintenanceEventFactory } from '#database/factories/boat_maintenance_event_factory'
import {
  createAdminUser,
  createBoatOwnerUser,
  createMechanicUser,
  createMemberUser,
} from '#tests/functional/helpers'

/**
 * Écrans et exports flotte gardés par capability (#845). Avant le correctif,
 * ils s'arrêtaient au scope organisation : un boat_owner (aucune capability
 * staff) lisait et exportait la maintenance de tous les bateaux de l'org.
 *
 * - pages flotte (planning, historique) : boat_owner → portail `/owner/boats`
 * - téléchargements : boat_owner → 403
 * - mechanic : `maintenance.view` lui ouvre la maintenance, pas les journaux
 *   carburant/navigation (`boats.view`)
 */

async function seedFleet() {
  const admin = await createAdminUser()
  const orgId = admin.organizationId!
  const boat = await BoatFactory.merge({ organizationId: orgId }).create()
  await BoatMaintenanceEventFactory.merge({ boatId: boat.id }).createMany(2)
  return { admin, orgId, boat }
}

const FLEET_PAGES = ['/planning', '/maintenance/history']

function maintenanceDownloads(boatId: number): string[] {
  return [
    '/maintenance/history.pdf',
    `/boats/${boatId}/maintenance-log.pdf`,
    `/boats/${boatId}/export/maintenance.csv`,
  ]
}

function boatLogDownloads(boatId: number): string[] {
  return [`/boats/${boatId}/export/fuel-logs.csv`, `/boats/${boatId}/export/navigation-logs.csv`]
}

test.group('Écrans et exports flotte — garde par capability (#845)', (group) => {
  group.each.setup(() => truncateDb())

  for (const path of FLEET_PAGES) {
    test(`boat_owner sur ${path} → redirigé vers son portail`, async ({ client }) => {
      const { orgId } = await seedFleet()
      const owner = await createBoatOwnerUser(orgId)

      const response = await client.get(path).loginAs(owner).redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', '/owner/boats')
    })

    test(`mechanic sur ${path} → 200`, async ({ client }) => {
      const { orgId } = await seedFleet()
      const mechanic = await createMechanicUser(orgId)

      const response = await client.get(path).loginAs(mechanic).withInertia()

      response.assertStatus(200)
    })
  }

  test('boat_owner → 403 sur chaque téléchargement de maintenance et de journal', async ({
    client,
    assert,
  }) => {
    const { orgId, boat } = await seedFleet()
    const owner = await createBoatOwnerUser(orgId)

    for (const path of [...maintenanceDownloads(boat.id), ...boatLogDownloads(boat.id)]) {
      const response = await client.get(path).loginAs(owner).redirects(0)
      assert.equal(response.status(), 403, path)
    }
  })

  test('boat_owner rattaché au bateau → 403 quand même (le portail est son seul accès)', async ({
    client,
    assert,
  }) => {
    const { orgId, boat } = await seedFleet()
    const owner = await createBoatOwnerUser(orgId)
    await owner.related('ownedBoats').attach([boat.id])

    for (const path of [...maintenanceDownloads(boat.id), ...boatLogDownloads(boat.id)]) {
      const response = await client.get(path).loginAs(owner).redirects(0)
      assert.equal(response.status(), 403, path)
    }
  })

  test('mechanic → 200 sur les téléchargements de maintenance', async ({ client, assert }) => {
    const { orgId, boat } = await seedFleet()
    const mechanic = await createMechanicUser(orgId)

    for (const path of maintenanceDownloads(boat.id)) {
      const response = await client.get(path).loginAs(mechanic).redirects(0)
      assert.equal(response.status(), 200, path)
    }
  })

  test('mechanic → 403 sur les journaux carburant et navigation', async ({ client, assert }) => {
    const { orgId, boat } = await seedFleet()
    const mechanic = await createMechanicUser(orgId)

    for (const path of boatLogDownloads(boat.id)) {
      const response = await client.get(path).loginAs(mechanic).redirects(0)
      assert.equal(response.status(), 403, path)
    }
  })

  test('member → 200 sur tous les téléchargements', async ({ client, assert }) => {
    const { orgId, boat } = await seedFleet()
    const member = await createMemberUser(orgId)

    for (const path of [...maintenanceDownloads(boat.id), ...boatLogDownloads(boat.id)]) {
      const response = await client.get(path).loginAs(member).redirects(0)
      assert.equal(response.status(), 200, path)
    }
  })
})
