import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import type User from '#models/user'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatEnginePartFactory } from '#database/factories/boat_engine_part_factory'
import { BoatGenericEquipmentFactory } from '#database/factories/boat_generic_equipment_factory'
import { BoatRigFactory } from '#database/factories/boat_rig_factory'
import { BoatSafetyEquipmentFactory } from '#database/factories/boat_safety_equipment_factory'
import { BoatSailFactory } from '#database/factories/boat_sail_factory'
import {
  createAdminUser,
  createBoatOwnerUser,
  createMechanicUser,
  createMemberUser,
} from '#tests/functional/helpers'

/**
 * Les pages d'équipement d'un bateau exigent la même capability que la fiche
 * `/boats/:id` (`boats.view` via `BoatPolicy.view`). `resolveBoat` ne scope que
 * par organisation : sans garde explicite, un mécanicien ou un propriétaire de
 * l'organisation ouvrait la fiche moteur, ses pièces, ses documents et son
 * historique d'entretien.
 *
 * Le boat_owner est rattaché au bateau : même propriétaire, il n'a accès qu'au
 * portail `/owner/boats/:id`, jamais aux pages staff.
 */

async function seed() {
  const admin = await createAdminUser()
  const organizationId = admin.organizationId!
  const boat = await BoatFactory.merge({ organizationId }).create()
  const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
  const part = await BoatEnginePartFactory.merge({ boatEngineId: engine.id }).create()
  const sail = await BoatSailFactory.merge({ boatId: boat.id }).create()
  await BoatRigFactory.merge({ boatId: boat.id }).create()
  const safety = await BoatSafetyEquipmentFactory.merge({ boatId: boat.id }).create()
  const generic = await BoatGenericEquipmentFactory.merge({ boatId: boat.id }).create()

  const member = await createMemberUser(organizationId)
  const mechanic = await createMechanicUser(organizationId)
  const owner = await createBoatOwnerUser(organizationId)
  await boat.related('owners').attach([owner.id])

  return {
    users: { member, mechanic, owner },
    urls: {
      engine: `/boats/${boat.id}/engines/${engine.id}`,
      enginePart: `/boats/${boat.id}/engines/${engine.id}/parts/${part.id}`,
      sail: `/boats/${boat.id}/sails/${sail.id}`,
      rig: `/boats/${boat.id}/rig`,
      safety: `/boats/${boat.id}/safety-equipment/${safety.id}`,
      generic: `/boats/${boat.id}/generic-equipment/${generic.id}`,
    },
  }
}

async function statusFor(client: ApiClient, url: string, user: User): Promise<number> {
  const response = await client.get(url).loginAs(user).redirects(0)
  return response.status()
}

test.group('Pages d’équipement — autorisation de lecture (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('fiche moteur : mechanic 403, boat_owner 403, member 200', async ({ client, assert }) => {
    const { users, urls } = await seed()

    assert.equal(await statusFor(client, urls.engine, users.mechanic), 403, 'mechanic')
    assert.equal(await statusFor(client, urls.engine, users.owner), 403, 'boat_owner')
    assert.equal(await statusFor(client, urls.engine, users.member), 200, 'member')
  })

  test('fiche pièce moteur : mechanic 403, boat_owner 403, member 200', async ({
    client,
    assert,
  }) => {
    const { users, urls } = await seed()

    assert.equal(await statusFor(client, urls.enginePart, users.mechanic), 403, 'mechanic')
    assert.equal(await statusFor(client, urls.enginePart, users.owner), 403, 'boat_owner')
    assert.equal(await statusFor(client, urls.enginePart, users.member), 200, 'member')
  })

  test('fiche voile : mechanic 403, boat_owner 403, member 200', async ({ client, assert }) => {
    const { users, urls } = await seed()

    assert.equal(await statusFor(client, urls.sail, users.mechanic), 403, 'mechanic')
    assert.equal(await statusFor(client, urls.sail, users.owner), 403, 'boat_owner')
    assert.equal(await statusFor(client, urls.sail, users.member), 200, 'member')
  })

  test('fiche gréement : mechanic 403, boat_owner 403, member 200', async ({ client, assert }) => {
    const { users, urls } = await seed()

    assert.equal(await statusFor(client, urls.rig, users.mechanic), 403, 'mechanic')
    assert.equal(await statusFor(client, urls.rig, users.owner), 403, 'boat_owner')
    assert.equal(await statusFor(client, urls.rig, users.member), 200, 'member')
  })

  test('fiche matériel de sécurité : mechanic 403, boat_owner 403, member 200', async ({
    client,
    assert,
  }) => {
    const { users, urls } = await seed()

    assert.equal(await statusFor(client, urls.safety, users.mechanic), 403, 'mechanic')
    assert.equal(await statusFor(client, urls.safety, users.owner), 403, 'boat_owner')
    assert.equal(await statusFor(client, urls.safety, users.member), 200, 'member')
  })

  test('fiche équipement générique : mechanic 403, boat_owner 403, member 200', async ({
    client,
    assert,
  }) => {
    const { users, urls } = await seed()

    assert.equal(await statusFor(client, urls.generic, users.mechanic), 403, 'mechanic')
    assert.equal(await statusFor(client, urls.generic, users.owner), 403, 'boat_owner')
    assert.equal(await statusFor(client, urls.generic, users.member), 200, 'member')
  })
})
