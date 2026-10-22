import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import { truncateDb } from '#tests/utils/db'
import TelemetryReadService from '#services/telemetry_read_service'
import { createAdminUser } from '#tests/functional/helpers'
import { boatWithSource } from '#tests/functional/instruments/helpers'
import { BoatTelemetrySampleFactory } from '#database/factories/boat_telemetry_sample_factory'
import type Boat from '#models/boat'
import type BoatInstrumentSource from '#models/boat_instrument_source'
import type { InstrumentSeries } from '#shared/types/instruments'

/**
 * Séries agrégées de l'historique (#992) : `date_bin`, bornes de plage,
 * isolement par bateau, et prop optionnelle `instrumentSeries` de `boats.show`.
 */

const NOW = DateTime.fromISO('2026-10-20T12:07:30Z', { setZone: true })
const SOG = 'navigation.speedOverGround'

async function sample(
  boat: Boat,
  source: BoatInstrumentSource,
  at: string,
  value: number | null,
  path = SOG
) {
  await BoatTelemetrySampleFactory.merge({
    boatId: boat.id,
    sourceId: source.id,
    path,
    recordedAt: DateTime.fromISO(at, { setZone: true }),
    value: value === null ? null : String(value),
    valueJson: value === null ? { latitude: 1, longitude: 2 } : null,
  }).create()
}

test.group('Instruments — TelemetryReadService.series', (group) => {
  group.each.setup(() => truncateDb())

  test('moyenne par minute sur 1 h, du plus ancien au plus récent', async ({ assert }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    await sample(boat, source!, '2026-10-20T12:05:10Z', 2)
    await sample(boat, source!, '2026-10-20T12:05:50Z', 4)
    await sample(boat, source!, '2026-10-20T12:06:10Z', 6)

    const service = await app.container.make(TelemetryReadService)
    const result = await service.series(boat, [SOG], '1h', NOW)

    assert.equal(result.range, '1h')
    assert.deepEqual(result.series[SOG], [
      ['2026-10-20T12:05:00.000Z', 3],
      ['2026-10-20T12:06:00.000Z', 6],
    ])
  })

  test('les seaux de 24 h font 15 minutes, ceux de 7 j une heure', async ({ assert }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    await sample(boat, source!, '2026-10-20T10:46:00Z', 1)
    await sample(boat, source!, '2026-10-20T10:59:00Z', 3)
    await sample(boat, source!, '2026-10-18T09:10:00Z', 5)

    const service = await app.container.make(TelemetryReadService)
    const day = await service.series(boat, [SOG], '24h', NOW)
    const week = await service.series(boat, [SOG], '7d', NOW)

    assert.deepEqual(day.series[SOG], [['2026-10-20T10:45:00.000Z', 2]])
    assert.deepEqual(week.series[SOG], [
      ['2026-10-18T09:00:00.000Z', 5],
      ['2026-10-20T10:00:00.000Z', 2],
    ])
  })

  test('exclut ce qui est hors plage, dans le futur, sans valeur ou à un autre bateau', async ({
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    const other = await boatWithSource(admin)
    await sample(boat, source!, '2026-10-20T10:00:00Z', 9) // avant la fenêtre d'1 h
    await sample(boat, source!, '2026-10-20T12:30:00Z', 9) // après `now`
    await sample(boat, source!, '2026-10-20T12:00:00Z', null, 'navigation.position')
    await sample(other.boat, other.source!, '2026-10-20T12:00:00Z', 9)
    await sample(boat, source!, '2026-10-20T12:00:00Z', 7)

    const service = await app.container.make(TelemetryReadService)
    const result = await service.series(boat, [SOG, 'navigation.position'], '1h', NOW)

    assert.deepEqual(result.series, { [SOG]: [['2026-10-20T12:00:00.000Z', 7]] })
  })

  test('une liste de chemins vide ne touche pas la base', async ({ assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin)
    const service = await app.container.make(TelemetryReadService)

    assert.deepEqual(await service.series(boat, [], '24h', NOW), { range: '24h', series: {} })
  })
})

test.group('Instruments — prop instrumentSeries de boats.show', (group) => {
  group.each.setup(() => truncateDb())

  const reload = (client: any, admin: any, boat: Boat, query: string) =>
    client
      .get(`/boats/${boat.id}?${query}`)
      .loginAs(admin)
      .withInertia()
      .header('X-Inertia-Partial-Component', 'boats/show')
      .header('X-Inertia-Partial-Data', 'instrumentSeries')

  test('absente de la visite initiale', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin)

    const response = await client
      .get(`/boats/${boat.id}?range=24h&paths[]=${SOG}`)
      .loginAs(admin)
      .withInertia()

    response.assertStatus(200)
    assert.notProperty(response.inertiaProps, 'instrumentSeries')
  })

  test('servie sur demande, bornée aux chemins numériques du catalogue', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    await sample(boat, source!, DateTime.now().minus({ minutes: 20 }).toUTC().toISO()!, 5)

    const response = await reload(
      client,
      admin,
      boat,
      `range=24h&paths[]=${SOG}&paths[]=navigation.position&paths[]=foo.bar`
    )

    response.assertStatus(200)
    const props = response.inertiaProps as { instrumentSeries: InstrumentSeries }
    assert.equal(props.instrumentSeries.range, '24h')
    assert.deepEqual(Object.keys(props.instrumentSeries.series), [SOG])
    assert.equal(props.instrumentSeries.series[SOG].length, 1)
    assert.equal(props.instrumentSeries.series[SOG][0][1], 5)
  })

  test('une plage inconnue donne une série vide, pas une erreur', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin)

    const response = await reload(client, admin, boat, `range=10y&paths[]=${SOG}`)

    response.assertStatus(200)
    const props = response.inertiaProps as { instrumentSeries: InstrumentSeries }
    assert.deepEqual(props.instrumentSeries, { range: '24h', series: {} })
  })
})
