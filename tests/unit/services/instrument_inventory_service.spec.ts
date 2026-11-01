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

  test('pose gone_at une seule fois, à la première absence', async ({ assert }) => {
    const admin = await createAdminUser()
    const { source } = await boatWithSource(admin)
    const service = new InstrumentInventoryService()
    const t0 = DateTime.fromISO('2026-11-01T10:00:00Z')

    await service.sync(source!, { devices: [device()] }, t0)
    const first = await service.sync(source!, { devices: [] }, t0.plus({ minutes: 11 }))
    const second = await service.sync(source!, { devices: [] }, t0.plus({ minutes: 30 }))

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
