import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import BoatInstrumentDevice from '#models/boat_instrument_device'
import InstrumentInventoryService, { mergePaths } from '#services/instrument_inventory_service'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser } from '#tests/functional/helpers'
import { boatWithSource } from '#tests/functional/instruments/helpers'
import { INSTRUMENT_INVENTORY_MAX_PATHS_PER_DEVICE } from '#shared/constants/instruments'
import type { InstrumentInventoryDevicePayload } from '#shared/types/instruments'

const device = (over: Partial<InstrumentInventoryDevicePayload> = {}) => ({
  deviceId: 'dev-1',
  label: 'Moteur',
  bus: 'n2k' as const,
  paths: ['propulsion.port.revolutions'],
  ...over,
})

test.group('InstrumentInventoryService', (group) => {
  group.each.setup(() => truncateDb())

  test('mergePaths : union triée, dédoublonnée, hors catalogue écartée, bornée', ({ assert }) => {
    assert.deepEqual(
      mergePaths(
        ['propulsion.port.runTime'],
        ['propulsion.port.revolutions', 'x.y', 'propulsion.port.runTime']
      ),
      ['propulsion.port.revolutions', 'propulsion.port.runTime']
    )
    const many = Array.from({ length: 300 }, (_, i) => `electrical.batteries.b${i}.voltage`)
    assert.lengthOf(mergePaths([], many), INSTRUMENT_INVENTORY_MAX_PATHS_PER_DEVICE)
  })

  test('mergePaths : à la borne, les chemins du lot courant passent avant les anciens', ({
    assert,
  }) => {
    const known = Array.from(
      { length: INSTRUMENT_INVENTORY_MAX_PATHS_PER_DEVICE },
      (_, i) => `electrical.batteries.a${i}.voltage`
    )
    const merged = mergePaths(known, ['tanks.fuel.0.currentLevel', 'propulsion.port.runTime'])
    assert.lengthOf(merged, INSTRUMENT_INVENTORY_MAX_PATHS_PER_DEVICE)
    assert.include(merged, 'tanks.fuel.0.currentLevel')
    assert.include(merged, 'propulsion.port.runTime')
  })

  test('fusionne les chemins d’un appel à l’autre et garde first_seen_at', async ({ assert }) => {
    const admin = await createAdminUser()
    const { source } = await boatWithSource(admin)
    const service = new InstrumentInventoryService()
    const t0 = DateTime.fromISO('2026-11-01T10:00:00Z')
    const t1 = t0.plus({ minutes: 5 })

    await service.sync(source!, { devices: [device()] }, t0)
    await service.sync(
      source!,
      { devices: [device({ paths: ['propulsion.port.runTime'], model: 'EVC' })] },
      t1
    )

    const row = await BoatInstrumentDevice.query().where('sourceId', source!.id).firstOrFail()
    assert.deepEqual(row.paths, ['propulsion.port.revolutions', 'propulsion.port.runTime'])
    assert.equal(row.model, 'EVC')
    assert.isTrue(row.firstSeenAt.equals(t0))
    assert.isTrue(row.lastSeenAt.equals(t1))
  })

  test('un champ absent est conservé, un null explicite l’efface', async ({ assert }) => {
    const admin = await createAdminUser()
    const { source } = await boatWithSource(admin)
    const service = new InstrumentInventoryService()

    await service.sync(source!, {
      devices: [device({ manufacturer: 'Volvo Penta', serialNumber: 'h:abc', address: 12 })],
    })
    await service.sync(source!, { devices: [device()] })
    let row = await BoatInstrumentDevice.query().where('sourceId', source!.id).firstOrFail()
    assert.equal(row.serialNumber, 'h:abc')
    assert.equal(row.manufacturer, 'Volvo Penta')
    assert.equal(row.address, 12)

    await service.sync(source!, { devices: [device({ serialNumber: null, address: null })] })
    row = await BoatInstrumentDevice.query().where('sourceId', source!.id).firstOrFail()
    assert.isNull(row.serialNumber)
    assert.isNull(row.address)
    assert.equal(row.manufacturer, 'Volvo Penta')
  })

  test('un lot de routine ne change que last_seen_at, pour tous les appareils', async ({
    assert,
  }) => {
    const admin = await createAdminUser()
    const { source } = await boatWithSource(admin)
    const service = new InstrumentInventoryService()
    const t0 = DateTime.fromISO('2026-11-01T10:00:00Z')
    const devices = [device(), device({ deviceId: 'dev-2', label: 'Batterie' })]

    await service.sync(source!, { devices }, t0)
    const before = await BoatInstrumentDevice.query().where('sourceId', source!.id).orderBy('id')
    const result = await service.sync(source!, { devices }, t0.plus({ minutes: 1 }))
    const after = await BoatInstrumentDevice.query().where('sourceId', source!.id).orderBy('id')

    assert.deepEqual(result, { created: 0, updated: 2, gone: 0 })
    for (const [index, row] of after.entries()) {
      assert.isTrue(row.lastSeenAt.equals(t0.plus({ minutes: 1 })))
      assert.isTrue(row.updatedAt!.equals(before[index].updatedAt!))
    }
  })

  test('pose gone_at une seule fois, à la première absence', async ({ assert }) => {
    const admin = await createAdminUser()
    const { source } = await boatWithSource(admin)
    const service = new InstrumentInventoryService()
    const t0 = DateTime.fromISO('2026-11-01T10:00:00Z')

    await service.sync(source!, { devices: [device()] }, t0)
    const early = await service.sync(source!, { devices: [] }, t0.plus({ minutes: 5 }))
    const first = await service.sync(source!, { devices: [] }, t0.plus({ minutes: 11 }))
    const second = await service.sync(source!, { devices: [] }, t0.plus({ minutes: 30 }))

    assert.equal(early.gone, 0)
    assert.equal(first.gone, 1)
    assert.equal(second.gone, 0)
    const row = await BoatInstrumentDevice.query().where('sourceId', source!.id).firstOrFail()
    assert.isTrue(row.goneAt!.equals(t0.plus({ minutes: 11 })))
  })

  test('isole les sources : un lot n’affecte pas les appareils d’un autre bateau', async ({
    assert,
  }) => {
    const admin = await createAdminUser()
    const a = await boatWithSource(admin)
    const b = await boatWithSource(admin)
    const service = new InstrumentInventoryService()

    await service.sync(a.source!, { devices: [device()] })
    await service.sync(b.source!, { devices: [] })

    const row = await BoatInstrumentDevice.query().where('sourceId', a.source!.id).firstOrFail()
    assert.isNull(row.goneAt)
  })
})
