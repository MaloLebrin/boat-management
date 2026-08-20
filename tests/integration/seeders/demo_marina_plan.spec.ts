import Boat from '#models/boat'
import BoatPositionHistory from '#models/boat_position_history'
import Mouillage from '#models/mouillage'
import Organization from '#models/organization'
import Pontoon from '#models/pontoon'
import Port from '#models/port'
import Spot from '#models/spot'
import User from '#models/user'
import SandboxSeeder from '#database/seeders/sandbox_seeder'
import DemoService from '#services/demo_service'
import PortService from '#services/port_service'
import { DEMO_EMAIL, DEMO_ORG_SLUG } from '#shared/constants/demo'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import type { QueryClientContract } from '@adonisjs/lucid/types/database'
import { test } from '@japa/runner'

/**
 * La sandbox publique doit montrer le plan marina, argument produit qui
 * restait invisible faute de port dans le seed démo (#478).
 *
 * Comme `admin_account_isolation.spec.ts`, les seeders sont instanciés
 * directement plutôt que lancés via `ace db:seed` : la transaction globale de
 * la suite `integration` reste ainsi active.
 */
const PORT_NAME = 'Port de la Grande Rade'
const PONTOON_NAMES = ['Ponton A', 'Ponton B', 'Ponton C']
const MOUILLAGE_NAME = 'Corps-morts du Sud'
const TOTAL_SPOTS = 20
const BERTHS: Array<[string, string]> = [
  ['Albatros', 'A03'],
  ['Cap Mistral', 'A05'],
  ['Marin du Vent', 'B02'],
  ['Étoile du Port', 'C01'],
  ['Tempête Douce', 'M2'],
]

function client(): QueryClientContract {
  return db.connection() as QueryClientContract
}

async function demoOrganization(): Promise<Organization> {
  return Organization.query().where('slug', DEMO_ORG_SLUG).firstOrFail()
}

async function demoPort(): Promise<Port> {
  const org = await demoOrganization()
  return Port.query().where('organizationId', org.id).where('name', PORT_NAME).firstOrFail()
}

async function spotsOfPort(port: Port): Promise<Spot[]> {
  const pontoons = await Pontoon.query().where('portId', port.id).select('id')
  const mouillages = await Mouillage.query().where('portId', port.id).select('id')

  const pontoonSpots =
    pontoons.length > 0
      ? await Spot.query().whereIn(
          'pontoonId',
          pontoons.map((p) => p.id)
        )
      : []
  const mouillageSpots =
    mouillages.length > 0
      ? await Spot.query().whereIn(
          'mouillageId',
          mouillages.map((m) => m.id)
        )
      : []

  return [...pontoonSpots, ...mouillageSpots]
}

test.group('Seeders — plan marina de la démo', () => {
  test('the demo org gets a port with pontoons, a mouillage and spots', async ({ assert }) => {
    await new SandboxSeeder(client()).run()

    const org = await demoOrganization()
    const ports = await Port.query().where('organizationId', org.id)
    assert.lengthOf(ports, 1)
    assert.equal(ports[0].name, PORT_NAME)
    assert.equal(ports[0].city, 'Saint-Malo')

    const pontoons = await Pontoon.query().where('portId', ports[0].id).orderBy('name', 'asc')
    assert.deepEqual(
      pontoons.map((p) => p.name),
      PONTOON_NAMES
    )

    const mouillages = await Mouillage.query().where('portId', ports[0].id)
    assert.lengthOf(mouillages, 1)
    assert.equal(mouillages[0].name, MOUILLAGE_NAME)

    const spots = await spotsOfPort(ports[0])
    assert.lengthOf(spots, TOTAL_SPOTS)
  }).timeout(120_000)

  test('every pontoon and mouillage carries a canvas position', async ({ assert }) => {
    await new SandboxSeeder(client()).run()

    const port = await demoPort()
    const pontoons = await Pontoon.query().where('portId', port.id)
    const mouillages = await Mouillage.query().where('portId', port.id)

    // Sans position enregistrée, `MarinaMapTab` retombe sur une grille
    // automatique : le plan de démo serait posé au hasard.
    for (const item of [...pontoons, ...mouillages]) {
      assert.isNotNull(item.positionX)
      assert.isNotNull(item.positionY)
    }
  }).timeout(120_000)

  test('the five demo boats are moored on their spot', async ({ assert }) => {
    await new SandboxSeeder(client()).run()

    const org = await demoOrganization()
    const port = await demoPort()
    const spots = await spotsOfPort(port)

    for (const [boatName, spotName] of BERTHS) {
      const boat = await Boat.query()
        .where('organizationId', org.id)
        .where('name', boatName)
        .firstOrFail()
      const spot = spots.find((s) => s.name === spotName)

      assert.isDefined(spot, `spot ${spotName} missing`)
      assert.equal(boat.spotId, spot!.id)
    }
  }).timeout(120_000)

  test('the ports list reports the occupancy of the demo port', async ({ assert }) => {
    await new SandboxSeeder(client()).run()

    const user = await User.query().where('email', DEMO_EMAIL).firstOrFail()
    const portService = await app.container.make(PortService)
    const ports = await portService.listForUser(user)

    assert.lengthOf(ports, 1)
    assert.equal(ports[0].pontoonCount, PONTOON_NAMES.length)
    assert.equal(ports[0].mouillageCount, 1)
    assert.equal(ports[0].totalSpots, TOTAL_SPOTS)
    assert.equal(ports[0].boatCount, BERTHS.length)
    assert.equal(ports[0].freeSpots, TOTAL_SPOTS - BERTHS.length)
  }).timeout(120_000)

  test('a demo reset rebuilds the port instead of leaving it behind', async ({ assert }) => {
    await new SandboxSeeder(client()).run()

    // `DemoService.reset()` supprime l'org démo (les ports/pontons/places
    // tombent en cascade) avant de rejouer le seed : la démo doit repartir
    // avec son plan marina, pas avec un port orphelin ni une erreur de FK.
    const demoService = await app.container.make(DemoService)
    await demoService.reset()

    const org = await demoOrganization()
    const ports = await Port.query().where('organizationId', org.id)
    assert.lengthOf(ports, 1)

    const spots = await spotsOfPort(ports[0])
    assert.lengthOf(spots, TOTAL_SPOTS)

    const moored = await Boat.query().where('organizationId', org.id).whereNotNull('spotId')
    assert.lengthOf(moored, BERTHS.length)
  }).timeout(180_000)

  test('re-running the seeder duplicates neither the port nor the berth history', async ({
    assert,
  }) => {
    await new SandboxSeeder(client()).run()
    await new SandboxSeeder(client()).run()

    const org = await demoOrganization()
    const ports = await Port.query().where('organizationId', org.id)
    assert.lengthOf(ports, 1)

    const pontoons = await Pontoon.query().where('portId', ports[0].id)
    assert.lengthOf(pontoons, PONTOON_NAMES.length)

    const mouillages = await Mouillage.query().where('portId', ports[0].id)
    assert.lengthOf(mouillages, 1)

    const spots = await spotsOfPort(ports[0])
    assert.lengthOf(spots, TOTAL_SPOTS)

    // `updateAssignment` journalise un changement de poste à chaque appel :
    // sans la garde `boat.spotId !== spot.id`, chaque run empilerait une ligne.
    for (const [boatName] of BERTHS) {
      const boat = await Boat.query()
        .where('organizationId', org.id)
        .where('name', boatName)
        .firstOrFail()
      const history = await BoatPositionHistory.query().where('boatId', boat.id)
      assert.lengthOf(history, 1, `${boatName} should have a single berth history row`)
    }
  }).timeout(180_000)
})
