import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { truncateDb } from '#tests/utils/db'
import BoatEngine from '#models/boat_engine'
import BoatPositionHistory from '#models/boat_position_history'
import NavigationLogEntry from '#models/navigation_log_entry'
import { createAdminUser } from '#tests/functional/helpers'
import { boatWithSource } from '#tests/functional/instruments/helpers'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { NavigationLogFactory } from '#database/factories/navigation_log_factory'
import type User from '#models/user'
import type Boat from '#models/boat'
import type BoatInstrumentSource from '#models/boat_instrument_source'

/**
 * Synchronisation métier de la télémétrie (#991) : le contrôleur d'ingestion
 * émet `TelemetryIngested`, le listener met à jour heures moteur, position et
 * journal de navigation. Aucun fake d'émetteur : on teste le chemin complet.
 */

let counter = 0

function at(minutesAgo: number) {
  return DateTime.now().minus({ minutes: minutesAgo }).startOf('second').toUTC().toISO()!
}

async function post(
  client: any,
  admin: User,
  boat: Boat,
  source: BoatInstrumentSource,
  samples: Array<Record<string, unknown>>
) {
  counter += 1
  const response = await client
    .post(`/boats/${boat.id}/telemetry`)
    .loginAs(admin)
    .header('referer', `/boats/${boat.id}`)
    .json({ sourceId: source.id, batchId: `batch-${counter}`, samples })
    .redirects(0)
  response.assertStatus(302)
  return response
}

const runTime = (key: string, minutesAgo: number, seconds: number) => ({
  path: `propulsion.${key}.runTime`,
  recordedAt: at(minutesAgo),
  value: seconds,
})

const position = (minutesAgo: number, latitude: number, longitude: number) => ({
  path: 'navigation.position',
  recordedAt: at(minutesAgo),
  valueJson: { latitude, longitude },
})

async function setup() {
  const admin = await createAdminUser()
  const { boat, source } = await boatWithSource(admin)
  return { admin, boat, source: source! }
}

test.group('Instruments — heures moteur', (group) => {
  group.each.setup(() => truncateDb())

  test('pose la base sans incrémenter, puis ajoute les heures entières', async ({
    client,
    assert,
  }) => {
    const { admin, boat, source } = await setup()
    const engine = await BoatEngineFactory.merge({
      boatId: boat.id,
      hours: 100,
      instrumentKey: 'port',
    }).create()

    await post(client, admin, boat, source, [runTime('port', 20, 36_000)])
    let reloaded = await BoatEngine.findOrFail(engine.id)
    assert.equal(reloaded.hours, 100)
    assert.equal(reloaded.instrumentRunTimeS, 36_000)

    // +2 h 30 : deux heures entières, la demi-heure reste à lire.
    await post(client, admin, boat, source, [runTime('port', 10, 36_000 + 9_000)])
    reloaded = await BoatEngine.findOrFail(engine.id)
    assert.equal(reloaded.hours, 102)
    assert.equal(reloaded.instrumentRunTimeS, 36_000 + 7_200)
  })

  test('un lot rejoué ne compte pas deux fois', async ({ client, assert }) => {
    const { admin, boat, source } = await setup()
    const engine = await BoatEngineFactory.merge({
      boatId: boat.id,
      hours: 10,
      instrumentKey: '0',
      instrumentRunTimeS: 0,
    }).create()
    const batch = [runTime('0', 5, 7_300)]

    await post(client, admin, boat, source, batch)
    await post(client, admin, boat, source, batch)

    const reloaded = await BoatEngine.findOrFail(engine.id)
    assert.equal(reloaded.hours, 12)
    assert.equal(reloaded.instrumentRunTimeS, 7_200)
  })

  test('un reset du calculateur re-base sans toucher aux heures', async ({ client, assert }) => {
    const { admin, boat, source } = await setup()
    const engine = await BoatEngineFactory.merge({
      boatId: boat.id,
      hours: 500,
      instrumentKey: 'port',
      instrumentRunTimeS: 90_000,
    }).create()

    await post(client, admin, boat, source, [runTime('port', 5, 600)])

    const reloaded = await BoatEngine.findOrFail(engine.id)
    assert.equal(reloaded.hours, 500)
    assert.equal(reloaded.instrumentRunTimeS, 600)
  })

  test('ignore un runTime négatif du calculateur', async ({ client, assert }) => {
    const { admin, boat, source } = await setup()
    const engine = await BoatEngineFactory.merge({
      boatId: boat.id,
      hours: 10,
      instrumentKey: 'port',
      instrumentRunTimeS: 3_600,
    }).create()

    await post(client, admin, boat, source, [runTime('port', 5, -1)])

    const reloaded = await BoatEngine.findOrFail(engine.id)
    assert.equal(reloaded.hours, 10)
    assert.equal(reloaded.instrumentRunTimeS, 3_600)
  })

  test('ignore un moteur sans instrument_key et un chemin d’un autre moteur', async ({
    client,
    assert,
  }) => {
    const { admin, boat, source } = await setup()
    const manual = await BoatEngineFactory.merge({ boatId: boat.id, hours: 50 }).create()
    const other = await BoatEngineFactory.merge({
      boatId: boat.id,
      hours: 70,
      instrumentKey: 'starboard',
      instrumentRunTimeS: 0,
    }).create()

    await post(client, admin, boat, source, [runTime('port', 5, 36_000)])

    const manualAfter = await BoatEngine.findOrFail(manual.id)
    assert.equal(manualAfter.hours, 50)
    const untouched = await BoatEngine.findOrFail(other.id)
    assert.equal(untouched.hours, 70)
    assert.equal(untouched.instrumentRunTimeS, 0)
  })
})

test.group('Instruments — position et journal', (group) => {
  group.each.setup(() => truncateDb())

  async function openPositions(boatId: number) {
    return await BoatPositionHistory.query()
      .where('boatId', boatId)
      .where('kind', 'position')
      .orderBy('id', 'asc')
  }

  test('crée une ligne position/gps avec SOG et COG convertis', async ({ client, assert }) => {
    const { admin, boat, source } = await setup()

    await post(client, admin, boat, source, [
      position(2, 43.29, 5.37),
      { path: 'navigation.speedOverGround', recordedAt: at(2), value: 3.0864 },
      { path: 'navigation.courseOverGroundTrue', recordedAt: at(2), value: Math.PI },
    ])

    const rows = await openPositions(boat.id)
    assert.lengthOf(rows, 1)
    assert.equal(rows[0].source, 'gps')
    assert.equal(rows[0].kind, 'position')
    assert.closeTo(Number(rows[0].latitude), 43.29, 1e-6)
    assert.closeTo(Number(rows[0].speedKnots), 6, 0.01)
    assert.equal(Number(rows[0].headingDegrees), 180)
    assert.isNull(rows[0].endedAt)
  })

  test('met à jour en place un fix proche et récent', async ({ client, assert }) => {
    const { admin, boat, source } = await setup()

    await post(client, admin, boat, source, [position(3, 43.29, 5.37)])
    // ~11 m plus loin.
    await post(client, admin, boat, source, [position(1, 43.2901, 5.37)])

    const rows = await openPositions(boat.id)
    assert.lengthOf(rows, 1)
    assert.closeTo(Number(rows[0].latitude), 43.2901, 1e-6)
  })

  test('ouvre une nouvelle ligne et clôt la précédente au-delà de 100 m', async ({
    client,
    assert,
  }) => {
    const { admin, boat, source } = await setup()

    await post(client, admin, boat, source, [position(3, 43.29, 5.37)])
    // ~1,1 km plus loin.
    await post(client, admin, boat, source, [position(1, 43.3, 5.37)])

    const rows = await openPositions(boat.id)
    assert.lengthOf(rows, 2)
    assert.isNotNull(rows[0].endedAt)
    assert.isNull(rows[1].endedAt)
  })

  test('ignore un fix plus ancien que la ligne ouverte', async ({ client, assert }) => {
    const { admin, boat, source } = await setup()

    await post(client, admin, boat, source, [position(1, 43.29, 5.37)])
    await post(client, admin, boat, source, [position(30, 43.5, 5.9)])

    const rows = await openPositions(boat.id)
    assert.lengthOf(rows, 1)
    assert.closeTo(Number(rows[0].latitude), 43.29, 1e-6)
  })

  test('un lot sans position ne touche pas à l’historique', async ({ client, assert }) => {
    const { admin, boat, source } = await setup()

    await post(client, admin, boat, source, [
      { path: 'navigation.speedOverGround', recordedAt: at(1), value: 2 },
    ])

    assert.lengthOf(await openPositions(boat.id), 0)
  })

  test('une ligne ouverte sans coordonnées est close, pas mise à jour', async ({
    client,
    assert,
  }) => {
    const { admin, boat, source } = await setup()
    await BoatPositionHistory.create({
      boatId: boat.id,
      kind: 'position',
      latitude: null,
      longitude: null,
      source: 'manual',
      startedAt: DateTime.now().minus({ hours: 1 }),
    })

    await post(client, admin, boat, source, [position(1, 43.29, 5.37)])

    const rows = await openPositions(boat.id)
    assert.lengthOf(rows, 2)
    assert.isNotNull(rows[0].endedAt)
    assert.equal(rows[1].source, 'gps')
  })

  test('ignore une position illisible', async ({ client, assert }) => {
    const { admin, boat, source } = await setup()

    await post(client, admin, boat, source, [
      { path: 'navigation.position', recordedAt: at(1), valueJson: { latitude: 'x' } },
    ])
    await post(client, admin, boat, source, [
      { path: 'navigation.position', recordedAt: at(1), valueJson: [1, 2] },
    ])
    await post(client, admin, boat, source, [
      {
        path: 'navigation.position',
        recordedAt: at(1),
        valueJson: { latitude: 120, longitude: 0 },
      },
    ])

    assert.lengthOf(await openPositions(boat.id), 0)
  })

  test('pas de point de journal sans trajet en cours', async ({ client, assert }) => {
    const { admin, boat, source } = await setup()
    await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: admin.organizationId!,
      status: 'completed',
    }).create()

    await post(client, admin, boat, source, [position(1, 43.29, 5.37)])

    assert.lengthOf(await NavigationLogEntry.all(), 0)
  })

  test('pose un point de journal « instruments » par tranche de 10 minutes', async ({
    client,
    assert,
  }) => {
    const { admin, boat, source } = await setup()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: admin.organizationId!,
    }).create()

    await post(client, admin, boat, source, [
      position(25, 43.29, 5.37),
      { path: 'navigation.speedOverGround', recordedAt: at(25), value: 2.5 },
      { path: 'environment.wind.directionTrue', recordedAt: at(25), value: Math.PI / 2 },
      { path: 'environment.wind.angleTrueWater', recordedAt: at(25), value: Math.PI / 4 },
      { path: 'environment.wind.speedTrue', recordedAt: at(25), value: 5 },
      { path: 'environment.depth.belowTransducer', recordedAt: at(25), value: 12.4 },
      { path: 'environment.water.temperature', recordedAt: at(25), value: 291.65 },
    ])
    // Trop proche du précédent : pas de nouveau point.
    await post(client, admin, boat, source, [position(20, 43.2905, 5.37)])
    // Plus de 10 minutes après : un second point.
    await post(client, admin, boat, source, [position(5, 43.3, 5.37)])

    const entries = await NavigationLogEntry.query()
      .where('navigationLogId', log.id)
      .orderBy('recordedAt', 'asc')
    assert.lengthOf(entries, 2)
    assert.equal(entries[0].source, 'instruments')
    assert.equal(entries[0].organizationId, admin.organizationId)
    assert.closeTo(Number(entries[0].latitude), 43.29, 1e-6)
    assert.closeTo(Number(entries[0].sogKn), 4.86, 0.01)
    assert.equal(entries[0].twdDeg, 90)
    assert.equal(entries[0].twaDeg, 45)
    assert.deepEqual(entries[0].weatherSnapshot, {
      depthM: 12.4,
      waterTemperatureC: 18.5,
      windSpeedKn: 9.72,
    })
    // Les dernières valeurs connues des autres chemins restent valables au point suivant.
    assert.deepEqual(entries[1].weatherSnapshot, entries[0].weatherSnapshot)
    assert.closeTo(Number(entries[1].latitude), 43.3, 1e-6)
  })

  test('un point de journal manuel garde la source « manual »', async ({ assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: admin.organizationId!,
    }).create()
    const entry = await NavigationLogEntry.create({
      navigationLogId: log.id,
      organizationId: admin.organizationId!,
      recordedAt: DateTime.now(),
    })
    await entry.refresh()
    assert.equal(entry.source, 'manual')
  })
})
