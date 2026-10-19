import { test } from '@japa/runner'
import { DateTime } from 'luxon'
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
import { TELEMETRY_MAX_BATCH_SIZE } from '#shared/constants/instruments'
import type { TelemetryBatchPayload } from '#shared/types/instruments'

const NOW = DateTime.fromISO('2026-10-19T10:00:00Z')
const SOURCE = { id: 7, boatId: 3, enabled: true }
const service = new TelemetryIngestService({} as never)

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
