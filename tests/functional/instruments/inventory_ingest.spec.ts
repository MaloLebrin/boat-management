import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import { truncateDb } from '#tests/utils/db'
import BoatInstrumentDevice from '#models/boat_instrument_device'
import InstrumentIngestTokenService from '#services/instrument_ingest_token_service'
import { createAdminUser } from '#tests/functional/helpers'
import { asInstrumentsReload, boatWithSource } from '#tests/functional/instruments/helpers'
import { INSTRUMENT_INVENTORY_PATH } from '#shared/constants/instruments'
import type { InstrumentInventoryProps } from '#shared/types/instruments'
import inventory from '../../fixtures/signalk_plugin_inventory.json' with { type: 'json' }

/**
 * Inventaire des appareils du bus (#1036) : le contrat du plugin
 * (`docs/architecture/signalk-fleetai-plugin-brief.md`) rejoué en entier.
 */

async function setup() {
  const admin = await createAdminUser()
  const { boat, source } = await boatWithSource(admin)
  const tokens = await app.container.make(InstrumentIngestTokenService)
  const token = await tokens.issueForBoat({ id: boat.id })
  return { admin, boat, source: source!, token, tokens }
}

test.group('Instruments — POST /api/instruments/inventory', (group) => {
  group.each.setup(() => truncateDb())

  test('201 avec un jeton valide : le lot type crée un appareil par entrée', async ({
    client,
    assert,
  }) => {
    const { source, token } = await setup()

    const response = await client
      .post(INSTRUMENT_INVENTORY_PATH)
      .header('Authorization', `Bearer ${token}`)
      .json(inventory)

    response.assertStatus(201)
    assert.deepEqual(response.body(), { created: 4, updated: 0, gone: 0 })
    const rows = await BoatInstrumentDevice.query().where('sourceId', source.id)
    assert.lengthOf(rows, 4)
    const engine = rows.find((row) => row.deviceId === 'n2k-a1b2c3d4e5f60718')!
    assert.equal(engine.manufacturer, 'Volvo Penta')
    assert.deepEqual(engine.paths, [
      'propulsion.port.coolantTemperature',
      'propulsion.port.revolutions',
      'propulsion.port.runTime',
    ])
    assert.isNull(engine.goneAt)
  })

  test('est idempotent : le même lot met à jour sans dupliquer', async ({ client, assert }) => {
    const { source, token } = await setup()
    const post = () =>
      client
        .post(INSTRUMENT_INVENTORY_PATH)
        .header('Authorization', `Bearer ${token}`)
        .json(inventory)

    await post()
    const second = await post()

    second.assertStatus(201)
    assert.deepEqual(second.body(), { created: 0, updated: 4, gone: 0 })
    const rows = await BoatInstrumentDevice.query().where('sourceId', source.id)
    assert.lengthOf(rows, 4)
  })

  test('marque disparu un appareil absent du lot, et efface la disparition à son retour', async ({
    client,
    assert,
  }) => {
    const { source, token } = await setup()
    const send = (devices: unknown[]) =>
      client
        .post(INSTRUMENT_INVENTORY_PATH)
        .header('Authorization', `Bearer ${token}`)
        .json({ devices })
    const [engine, battery] = inventory.devices

    await send([engine, battery])
    // Dans le délai de grâce : absent du lot mais encore considéré présent.
    const grace = await send([engine])
    assert.deepEqual(grace.body(), { created: 0, updated: 1, gone: 0 })
    await BoatInstrumentDevice.query()
      .where('sourceId', source.id)
      .where('deviceId', battery.deviceId)
      .update({ lastSeenAt: DateTime.now().minus({ minutes: 11 }).toSQL()! })
    const gone = await send([engine])
    assert.deepEqual(gone.body(), { created: 0, updated: 1, gone: 1 })
    const missing = await BoatInstrumentDevice.query()
      .where('sourceId', source.id)
      .where('deviceId', battery.deviceId)
      .firstOrFail()
    assert.isNotNull(missing.goneAt)

    const back = await send([engine, battery])
    assert.deepEqual(back.body(), { created: 0, updated: 2, gone: 0 })
    await missing.refresh()
    assert.isNull(missing.goneAt)
  })

  test('un lot vide n’efface rien dans le délai de grâce', async ({ client, assert }) => {
    const { source, token } = await setup()
    const send = (devices: unknown[]) =>
      client
        .post(INSTRUMENT_INVENTORY_PATH)
        .header('Authorization', `Bearer ${token}`)
        .json({ devices })

    await send(inventory.devices)
    const empty = await send([])

    assert.deepEqual(empty.body(), { created: 0, updated: 0, gone: 0 })
    const rows = await BoatInstrumentDevice.query()
      .where('sourceId', source.id)
      .whereNotNull('goneAt')
    assert.lengthOf(rows, 0)
  })

  test('409 source_disabled : une source désactivée refuse le lot, comme l’ingestion', async ({
    client,
    assert,
  }) => {
    const { source, token } = await setup()
    source.enabled = false
    await source.save()

    const response = await client
      .post(INSTRUMENT_INVENTORY_PATH)
      .header('Authorization', `Bearer ${token}`)
      .json(inventory)

    response.assertStatus(409)
    assert.equal(response.body().error, 'source_disabled')
    assert.lengthOf(await BoatInstrumentDevice.query().where('sourceId', source.id), 0)
  })

  test('deux premiers lots simultanés ne produisent ni 500 ni doublon', async ({
    client,
    assert,
  }) => {
    const { source, token } = await setup()
    const send = () =>
      client
        .post(INSTRUMENT_INVENTORY_PATH)
        .header('Authorization', `Bearer ${token}`)
        .json(inventory)

    const [a, b] = await Promise.all([send(), send()])

    a.assertStatus(201)
    b.assertStatus(201)
    assert.lengthOf(await BoatInstrumentDevice.query().where('sourceId', source.id), 4)
  })

  test('401 pour un jeton révoqué ou absent', async ({ client }) => {
    const { boat, token, tokens } = await setup()
    await tokens.revokeForBoat({ id: boat.id })

    const revoked = await client
      .post(INSTRUMENT_INVENTORY_PATH)
      .header('Authorization', `Bearer ${token}`)
      .json(inventory)
    const anonymous = await client.post(INSTRUMENT_INVENTORY_PATH).json(inventory)

    revoked.assertStatus(401)
    anonymous.assertStatus(401)
  })

  test('422 sur un lot invalide, sans rien écrire', async ({ client, assert }) => {
    const { source, token } = await setup()
    const send = (body: unknown) =>
      client.post(INSTRUMENT_INVENTORY_PATH).header('Authorization', `Bearer ${token}`).json(body)
    const device = inventory.devices[0]

    const badBus = await send({ devices: [{ ...device, bus: 'usb' }] })
    const noId = await send({ devices: [{ ...device, deviceId: '' }] })
    const control = await send({ devices: [{ ...device, label: 'a\u0000b' }] })
    const duplicate = await send({ devices: [device, device] })
    const missing = await send({})

    for (const response of [badBus, noId, control, missing]) {
      response.assertStatus(422)
      assert.equal(response.body().error, 'validation_failed')
    }
    duplicate.assertStatus(422)
    assert.equal(duplicate.body().error, 'duplicate_device')
    assert.lengthOf(await BoatInstrumentDevice.query().where('sourceId', source.id), 0)
  })

  test('écarte les chemins hors catalogue sans refuser le lot', async ({ client, assert }) => {
    const { source, token } = await setup()
    const device = { ...inventory.devices[0], paths: ['propulsion.port.revolutions', 'foo.bar'] }

    const response = await client
      .post(INSTRUMENT_INVENTORY_PATH)
      .header('Authorization', `Bearer ${token}`)
      .json({ devices: [device] })

    response.assertStatus(201)
    const row = await BoatInstrumentDevice.query().where('sourceId', source.id).firstOrFail()
    assert.deepEqual(row.paths, ['propulsion.port.revolutions'])
  })

  test('limite le débit par source (30 par minute, partagés avec l’ingestion)', async ({
    client,
  }) => {
    const { token } = await setup()
    const send = () =>
      client
        .post(INSTRUMENT_INVENTORY_PATH)
        .header('Authorization', `Bearer ${token}`)
        .header('X-Forwarded-For', '198.18.1.1')
        .json({ devices: [] })

    for (let index = 0; index < 30; index++) {
      const accepted = await send()
      accepted.assertStatus(201)
    }
    const limited = await send()
    limited.assertStatus(429)
  })

  test('ne sérialise jamais le numéro de série, ni dans la réponse ni dans la fiche bateau', async ({
    client,
    assert,
  }) => {
    const { admin, boat, token } = await setup()
    const response = await client
      .post(INSTRUMENT_INVENTORY_PATH)
      .header('Authorization', `Bearer ${token}`)
      .json(inventory)
    assert.notInclude(JSON.stringify(response.body()), 'h:7f3a9c21')

    const page = await asInstrumentsReload(client.get(`/boats/${boat.id}`).loginAs(admin)).header(
      'X-Inertia-Partial-Data',
      'inventory'
    )
    const props = page.body().props.inventory as InstrumentInventoryProps
    assert.lengthOf(props.devices, 4)
    assert.notInclude(JSON.stringify(props), 'h:7f3a9c21')
    assert.notProperty(props.devices[0], 'serialNumber')
  })
})
