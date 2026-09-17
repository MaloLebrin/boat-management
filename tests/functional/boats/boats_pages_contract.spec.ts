import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatSailFactory } from '#database/factories/boat_sail_factory'
import { BoatRigFactory } from '#database/factories/boat_rig_factory'
import { createAdminUser } from '#tests/functional/helpers'
import { assertPageContract } from '#tests/support/inertia_page'

/**
 * Contrat des pages du domaine bateau (#689).
 *
 * `boats/show` est le cas le plus instructif du dépôt : onze de ses props sont
 * **différées** (#463), donc absentes de la réponse initiale par construction.
 * La fabrique les lit dans le page object plutôt que de les exiger — le contrat
 * porte sur le squelette, qui est exactement ce que la page peint d'abord.
 */

test.group('Boats pages contract (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('GET /boats renders boats/index with its full props contract', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get('/boats').loginAs(user).withInertia()

    assertPageContract(assert, response, 'boats/index')
  })

  test('GET /boats/new renders boats/new', async ({ client, assert }) => {
    const user = await createAdminUser()

    const response = await client.get('/boats/new').loginAs(user).withInertia()

    assertPageContract(assert, response, 'boats/new')
  })

  test('GET /boats/:id renders boats/show with its non-deferred props', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/boats/${boat.id}`).loginAs(user).withInertia()

    assertPageContract(assert, response, 'boats/show')
  })

  test('GET /boats/:id/edit renders boats/edit', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/boats/${boat.id}/edit`).loginAs(user).withInertia()

    assertPageContract(assert, response, 'boats/edit')
  })

  test('GET engine edit renders boats/engine_edit', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/edit`)
      .loginAs(user)
      .withInertia()

    assertPageContract(assert, response, 'boats/engine_edit')
  })

  test('GET sail edit renders boats/sail_edit', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const sail = await BoatSailFactory.merge({ boatId: boat.id }).create()

    const response = await client
      .get(`/boats/${boat.id}/sails/${sail.id}/edit`)
      .loginAs(user)
      .withInertia()

    assertPageContract(assert, response, 'boats/sail_edit')
  })

  test('GET rig edit renders boats/rig_edit', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await BoatRigFactory.merge({ boatId: boat.id }).create()

    const response = await client.get(`/boats/${boat.id}/rig/edit`).loginAs(user).withInertia()

    assertPageContract(assert, response, 'boats/rig_edit')
  })
})
