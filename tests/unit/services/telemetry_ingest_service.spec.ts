import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import AisTargetService from '#services/ais_target_service'
import TelemetryIngestService from '#services/telemetry_ingest_service'
import {
  InstrumentSourceDisabledError,
  InstrumentSourceNotFoundError,
  TelemetryBatchTooLargeError,
  TelemetryPathNotAllowedError,
  TelemetryRecordedAtInvalidError,
  TelemetryValueKindMismatchError,
  TelemetryValueOutOfRangeError,
} from '#exceptions/instrument_errors'
import {
  TELEMETRY_FUTURE_TOLERANCE_MIN,
  TELEMETRY_MAX_BATCH_SIZE,
} from '#shared/constants/instruments'
import type { TelemetryBatchPayload, TelemetrySampleInput } from '#shared/types/instruments'
import type { JsonValue } from '#shared/types/notification'

const NOW = DateTime.fromISO('2026-10-19T10:00:00Z')
const SOURCE = { id: 7, boatId: 3, enabled: true }
const service = new TelemetryIngestService({} as never, {} as never)

function batch(samples: TelemetryBatchPayload['samples'], sourceId = 7): TelemetryBatchPayload {
  return { sourceId, batchId: 'b-1', samples }
}

test.group('TelemetryIngestService.prepare (unit)', () => {
  test('traduit un lot en lignes SQL en UTC', ({ assert }) => {
    const rows = service.prepare(
      SOURCE,
      batch([
        { path: 'navigation.speedOverGround', recordedAt: '2026-10-19T11:59:00+02:00', value: 3.2 },
        {
          path: 'navigation.position',
          recordedAt: '2026-10-19T09:59:00Z',
          valueJson: { latitude: 43.2, longitude: 5.3 },
        },
      ]),
      NOW
    )
    assert.lengthOf(rows, 2)
    assert.equal(rows[0].recorded_at, '2026-10-19T09:59:00.000Z')
    assert.equal(rows[0].value, 3.2)
    assert.isNull(rows[0].value_json)
    assert.equal(rows[0].boat_id, 3)
    assert.equal(rows[1].value_json, '{"latitude":43.2,"longitude":5.3}')
    assert.isNull(rows[1].value)
  })

  test('refuse un lot d’une autre source', ({ assert }) => {
    assert.throws(
      () => service.prepare(SOURCE, batch([], 99), NOW),
      InstrumentSourceNotFoundError as never
    )
  })

  test('refuse une source désactivée', ({ assert }) => {
    assert.throws(
      () => service.prepare({ ...SOURCE, enabled: false }, batch([]), NOW),
      InstrumentSourceDisabledError as never
    )
  })

  test('refuse un lot trop gros', ({ assert }) => {
    const samples = Array.from({ length: TELEMETRY_MAX_BATCH_SIZE + 1 }, () => ({
      path: 'navigation.speedOverGround',
      recordedAt: '2026-10-19T09:00:00Z',
      value: 1,
    }))
    assert.throws(
      () => service.prepare(SOURCE, batch(samples), NOW),
      TelemetryBatchTooLargeError as never
    )
  })

  test('refuse un chemin hors liste blanche', ({ assert }) => {
    assert.throws(
      () =>
        service.prepare(
          SOURCE,
          batch([{ path: 'design.length', recordedAt: '2026-10-19T09:00:00Z', value: 1 }]),
          NOW
        ),
      TelemetryPathNotAllowedError as never
    )
  })

  test('D9 : accepte +5 min, refuse au-delà, refuse l’illisible', ({ assert }) => {
    const at = (iso: string) =>
      batch([{ path: 'navigation.speedOverGround', recordedAt: iso, value: 1 }])
    assert.lengthOf(service.prepare(SOURCE, at('2026-10-19T10:05:00Z'), NOW), 1)
    assert.throws(
      () => service.prepare(SOURCE, at('2026-10-19T10:05:01Z'), NOW),
      TelemetryRecordedAtInvalidError as never
    )
    assert.throws(
      () => service.prepare(SOURCE, at('hier'), NOW),
      TelemetryRecordedAtInvalidError as never
    )
  })

  test('refuse une valeur non finie, hors plage ou du mauvais genre', ({ assert }) => {
    const sample = (path: string, extra: object) =>
      batch([{ path, recordedAt: '2026-10-19T09:00:00Z', ...extra }])
    assert.throws(
      () =>
        service.prepare(SOURCE, sample('navigation.speedOverGround', { value: Number.NaN }), NOW),
      TelemetryValueOutOfRangeError as never
    )
    assert.throws(
      () => service.prepare(SOURCE, sample('navigation.speedOverGround', { value: 1e12 }), NOW),
      TelemetryValueOutOfRangeError as never
    )
    assert.throws(
      () => service.prepare(SOURCE, sample('navigation.speedOverGround', {}), NOW),
      TelemetryValueKindMismatchError as never
    )
    assert.throws(
      () => service.prepare(SOURCE, sample('navigation.position', { value: 1 }), NOW),
      TelemetryValueKindMismatchError as never
    )
  })

  test('chunk découpe sans perdre ni réordonner', ({ assert }) => {
    const chunks = service.chunk([1, 2, 3, 4, 5], 2)
    assert.deepEqual(chunks, [[1, 2], [3, 4], [5]])
    assert.deepEqual(service.chunk([], 2), [])
  })
})

// ---------------------------------------------------------------------------
// partition
// ---------------------------------------------------------------------------

test.group('TelemetryIngestService.partition (unit)', () => {
  function aisSample(mmsi: string): TelemetrySampleInput {
    return {
      path: `ais.${mmsi}`,
      recordedAt: '2026-10-19T09:00:00Z',
      valueJson: { latitude: 43.29, longitude: 5.37, name: null },
    }
  }

  function measureSample(path: string): TelemetrySampleInput {
    return { path, recordedAt: '2026-10-19T09:00:00Z', value: 1 }
  }

  test('sépare les mesures des cibles AIS valides', ({ assert }) => {
    const speed = measureSample('navigation.speedOverGround')
    const ais = aisSample('244630000')
    const { measures, ais: aisOut } = service.partition([speed, ais])
    assert.deepEqual(measures, [speed])
    assert.deepEqual(aisOut, [ais])
  })

  test('ais.abc (MMSI invalide) reste côté mesures et y sera refusé', ({ assert }) => {
    const invalid = measureSample('ais.abc')
    const { measures, ais: aisOut } = service.partition([invalid])
    assert.deepEqual(measures, [invalid])
    assert.lengthOf(aisOut, 0)
  })

  test('ais.12345 (8 chiffres) reste côté mesures', ({ assert }) => {
    const short = measureSample('ais.12345678')
    const { measures, ais: aisOut } = service.partition([short])
    assert.deepEqual(measures, [short])
    assert.lengthOf(aisOut, 0)
  })

  test('lot vide donne deux tableaux vides', ({ assert }) => {
    const { measures, ais: aisOut } = service.partition([])
    assert.lengthOf(measures, 0)
    assert.lengthOf(aisOut, 0)
  })

  test('lot mixte : ordre préservé dans chaque partition', ({ assert }) => {
    const s1 = aisSample('111111111')
    const s2 = measureSample('navigation.speedOverGround')
    const s3 = aisSample('222222222')
    const s4 = measureSample('navigation.headingTrue')
    const { measures, ais: aisOut } = service.partition([s1, s2, s3, s4])
    assert.deepEqual(aisOut, [s1, s3])
    assert.deepEqual(measures, [s2, s4])
  })
})

// ---------------------------------------------------------------------------
// prepareAis
// ---------------------------------------------------------------------------

test.group('TelemetryIngestService.prepareAis (unit)', () => {
  // prepareAis delegates to AisTargetService.prepare which is a pure method
  const serviceWithAis = new TelemetryIngestService({} as never, new AisTargetService())

  const VALID_AIS_VALUE = {
    name: 'BETA',
    latitude: 43.29,
    longitude: 5.37,
    sogMs: 3.5,
    cogRad: 1.2,
    shipType: 70,
    shipTypeName: 'Cargo',
    cpaM: null,
    tcpaS: null,
  }

  function aisSample(
    mmsi: string,
    recordedAt: string,
    valueJson: JsonValue = VALID_AIS_VALUE
  ): TelemetrySampleInput {
    return { path: `ais.${mmsi}`, recordedAt, valueJson }
  }

  test('traduit un échantillon AIS valide en ligne SQL', ({ assert }) => {
    const sample = aisSample('244630000', '2026-10-19T09:55:00Z')
    const rows = serviceWithAis.prepareAis(SOURCE, [sample], NOW)
    assert.lengthOf(rows, 1)
    assert.equal(rows[0].mmsi, '244630000')
    assert.equal(rows[0].boat_id, SOURCE.boatId)
    assert.equal(rows[0].source_id, SOURCE.id)
    assert.equal(rows[0].recorded_at, '2026-10-19T09:55:00.000Z')
    assert.equal(rows[0].latitude, 43.29)
    assert.equal(rows[0].longitude, 5.37)
  })

  test(`D9 : accepte +${TELEMETRY_FUTURE_TOLERANCE_MIN} min, refuse au-delà`, ({ assert }) => {
    const atLimit = NOW.plus({ minutes: TELEMETRY_FUTURE_TOLERANCE_MIN }).toISO()!
    const beyondLimit = NOW.plus({ minutes: TELEMETRY_FUTURE_TOLERANCE_MIN + 1 }).toISO()!

    assert.lengthOf(serviceWithAis.prepareAis(SOURCE, [aisSample('244630000', atLimit)], NOW), 1)
    assert.throws(
      () => serviceWithAis.prepareAis(SOURCE, [aisSample('244630000', beyondLimit)], NOW),
      TelemetryRecordedAtInvalidError as never
    )
  })

  test('date illisible : TelemetryRecordedAtInvalidError', ({ assert }) => {
    assert.throws(
      () => serviceWithAis.prepareAis(SOURCE, [aisSample('244630000', 'hier')], NOW),
      TelemetryRecordedAtInvalidError as never
    )
  })

  test('position absente : TelemetryValueKindMismatchError', ({ assert }) => {
    const noPosition = { name: 'GAMMA', sogMs: null, cogRad: null, shipType: null }
    assert.throws(
      () =>
        serviceWithAis.prepareAis(
          SOURCE,
          [{ path: 'ais.244630000', recordedAt: '2026-10-19T09:00:00Z', valueJson: noPosition }],
          NOW
        ),
      TelemetryValueKindMismatchError as never
    )
  })

  test('valueJson null : TelemetryValueKindMismatchError', ({ assert }) => {
    assert.throws(
      () =>
        serviceWithAis.prepareAis(
          SOURCE,
          [{ path: 'ais.244630000', recordedAt: '2026-10-19T09:00:00Z', valueJson: null }],
          NOW
        ),
      TelemetryValueKindMismatchError as never
    )
  })

  test('valeur numérique hors plage : TelemetryValueKindMismatchError', ({ assert }) => {
    const outOfRange = { ...VALID_AIS_VALUE, sogMs: 1e12 }
    assert.throws(
      () =>
        serviceWithAis.prepareAis(
          SOURCE,
          [{ path: 'ais.244630000', recordedAt: '2026-10-19T09:00:00Z', valueJson: outOfRange }],
          NOW
        ),
      TelemetryValueKindMismatchError as never
    )
  })
})
