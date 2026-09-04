import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { createAdminUser, createBoatOwnerUser } from '#tests/functional/helpers'
import type { EngineListFilters, EngineListItem, EngineListSummary } from '#shared/types/engine'

type IndexProps = {
  engines: { data: EngineListItem[]; meta: { total: number } }
  filters: EngineListFilters
  boatOptions: Array<{ id: number; name: string }>
  summary: EngineListSummary
}

test.group('Engines index (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('GET /engines requires authentication', async ({ client }) => {
    const response = await client.get('/engines').redirects(0)

    response.assertStatus(302)
  })

  test('GET /engines lists every engine of the org, across boats', async ({ client, assert }) => {
    const user = await createAdminUser()
    const first = await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Alizé',
    }).create()
    const second = await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Bora',
    }).create()
    const engineA = await BoatEngineFactory.merge({ boatId: first.id }).create()
    const engineB = await BoatEngineFactory.merge({ boatId: second.id }).create()

    // Une autre organisation ne doit jamais apparaître dans l'inventaire.
    const otherUser = await createAdminUser()
    const otherBoat = await BoatFactory.merge({
      organizationId: otherUser.organizationId!,
    }).create()
    await BoatEngineFactory.merge({ boatId: otherBoat.id }).create()

    const response = await client.get('/engines').loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('engines/index')
    const props = response.inertiaProps as IndexProps

    assert.deepEqual(
      props.engines.data.map((engine) => engine.id).sort((a, b) => a - b),
      [engineA.id, engineB.id].sort((a, b) => a - b)
    )
    assert.deepEqual(props.engines.data.map((engine) => engine.boatName).sort(), ['Alizé', 'Bora'])
    assert.equal(props.engines.meta.total, 2)
    assert.equal(props.summary.total, 2)
  })

  test('GET /engines filters by boat', async ({ client, assert }) => {
    const user = await createAdminUser()
    const kept = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const other = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: kept.id }).create()
    await BoatEngineFactory.merge({ boatId: other.id }).create()

    const response = await client.get(`/engines?boatId=${kept.id}`).loginAs(user).withInertia()

    const props = response.inertiaProps as IndexProps
    assert.deepEqual(
      props.engines.data.map((row) => row.id),
      [engine.id]
    )
    assert.equal(props.filters.boatId, kept.id)
    // Les compteurs suivent le périmètre filtré, pas la page.
    assert.equal(props.summary.total, 1)
  })

  test('GET /engines ignores a boat filter from another organization', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await BoatEngineFactory.merge({ boatId: boat.id }).create()

    const otherUser = await createAdminUser()
    const foreignBoat = await BoatFactory.merge({
      organizationId: otherUser.organizationId!,
    }).create()
    await BoatEngineFactory.merge({ boatId: foreignBoat.id }).create()

    const response = await client
      .get(`/engines?boatId=${foreignBoat.id}`)
      .loginAs(user)
      .withInertia()

    const props = response.inertiaProps as IndexProps
    // Le filtre étranger est ignoré (et remis à zéro), jamais appliqué : la
    // liste reste celle de l'organisation de l'utilisateur.
    assert.equal(props.filters.boatId, 0)
    assert.equal(props.engines.meta.total, 1)
    assert.equal(props.engines.data[0].boatId, boat.id)
  })

  test('GET /engines searches brand, serial number and boat name', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Sirocco',
    }).create()
    const yamaha = await BoatEngineFactory.merge({
      boatId: boat.id,
      brand: 'Yamaha',
      model: 'F150',
      serialNumber: 'SN-ALPHA',
    }).create()

    const otherBoat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Mistral',
    }).create()
    const volvo = await BoatEngineFactory.merge({
      boatId: otherBoat.id,
      brand: 'Volvo Penta',
      model: 'D2-40',
      serialNumber: 'SN-BETA',
    }).create()

    const byBrand = await client.get('/engines?q=yamaha').loginAs(user).withInertia()
    assert.deepEqual(
      (byBrand.inertiaProps as IndexProps).engines.data.map((row) => row.id),
      [yamaha.id]
    )

    const bySerial = await client.get('/engines?q=SN-BETA').loginAs(user).withInertia()
    assert.deepEqual(
      (bySerial.inertiaProps as IndexProps).engines.data.map((row) => row.id),
      [volvo.id]
    )

    const byBoat = await client.get('/engines?q=Sirocco').loginAs(user).withInertia()
    assert.deepEqual(
      (byBoat.inertiaProps as IndexProps).engines.data.map((row) => row.id),
      [yamaha.id]
    )
  })

  test('GET /engines filters by kind, status and family', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const outboard = await BoatEngineFactory.merge({
      boatId: boat.id,
      kind: 'outboard',
      family: 'outboard_4t',
      status: 'operational',
    }).create()
    await BoatEngineFactory.merge({
      boatId: boat.id,
      kind: 'inboard',
      family: 'inboard_diesel_shaft',
      status: 'in_maintenance',
    }).create()

    const byKind = await client.get('/engines?kind=outboard').loginAs(user).withInertia()
    assert.deepEqual(
      (byKind.inertiaProps as IndexProps).engines.data.map((row) => row.id),
      [outboard.id]
    )

    const byStatus = await client.get('/engines?status=operational').loginAs(user).withInertia()
    assert.deepEqual(
      (byStatus.inertiaProps as IndexProps).engines.data.map((row) => row.id),
      [outboard.id]
    )

    const byFamily = await client.get('/engines?family=outboard_4t').loginAs(user).withInertia()
    assert.deepEqual(
      (byFamily.inertiaProps as IndexProps).engines.data.map((row) => row.id),
      [outboard.id]
    )

    // Vocabulaire fermé : une valeur inconnue est ignorée, pas transmise.
    const bogus = await client.get('/engines?kind=teleportation').loginAs(user).withInertia()
    const bogusProps = bogus.inertiaProps as IndexProps
    assert.equal(bogusProps.filters.kind, '')
    assert.equal(bogusProps.engines.meta.total, 2)
  })

  test('GET /engines counts engines per status over the whole fleet', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await BoatEngineFactory.merge({ boatId: boat.id, status: 'operational' }).create()
    await BoatEngineFactory.merge({ boatId: boat.id, status: 'in_maintenance' }).create()
    await BoatEngineFactory.merge({ boatId: boat.id, status: 'out_of_service' }).create()
    await BoatEngineFactory.merge({ boatId: boat.id, status: 'retired' }).create()

    // La recherche ne doit pas déplacer les compteurs : ce sont des indicateurs
    // de flotte, pas de page.
    const response = await client.get('/engines?q=zzz-aucun-match').loginAs(user).withInertia()

    const props = response.inertiaProps as IndexProps
    assert.equal(props.engines.meta.total, 0)
    assert.deepEqual(props.summary, {
      total: 4,
      operational: 1,
      inMaintenance: 1,
      // `retired` est compté avec `out_of_service` : deux façons de dire
      // « ce moteur ne tourne plus ».
      outOfService: 2,
    })
  })

  test('GET /engines paginates', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    for (let i = 0; i < 7; i++) {
      await BoatEngineFactory.merge({ boatId: boat.id }).create()
    }

    const response = await client.get('/engines?perPage=5&page=2').loginAs(user).withInertia()

    const props = response.inertiaProps as IndexProps
    assert.equal(props.engines.data.length, 2)
    assert.equal(props.engines.meta.total, 7)
  })

  test('GET /engines redirects a boat owner to their portal', async ({ client }) => {
    const admin = await createAdminUser()
    const owner = await createBoatOwnerUser(admin.organizationId!)

    const response = await client.get('/engines').loginAs(owner).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/owner/boats')
  })

  test('GET /engines exposes the org boats as filter options', async ({ client, assert }) => {
    const user = await createAdminUser()
    await BoatFactory.merge({ organizationId: user.organizationId!, name: 'Zephyr' }).create()
    await BoatFactory.merge({ organizationId: user.organizationId!, name: 'Aquilon' }).create()

    const response = await client.get('/engines').loginAs(user).withInertia()

    const props = response.inertiaProps as IndexProps
    assert.deepEqual(
      props.boatOptions.map((boat) => boat.name),
      ['Aquilon', 'Zephyr']
    )
  })
})
