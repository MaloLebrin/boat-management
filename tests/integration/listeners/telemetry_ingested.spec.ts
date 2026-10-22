import { test } from '@japa/runner'
import TelemetryIngested from '#events/telemetry_ingested'
import OnTelemetryIngested from '#listeners/on_telemetry_ingested'
import emitter from '@adonisjs/core/services/emitter'
import type BoatInstrumentSource from '#models/boat_instrument_source'

/**
 * Listener de la synchronisation métier (#991) : il saute les lots entièrement
 * rejoués et ne laisse jamais une panne de synchro remonter à l'ingestion.
 */

const SOURCE = { id: 1, boatId: 9 } as BoatInstrumentSource

function event(accepted: number) {
  return new TelemetryIngested(
    SOURCE,
    { accepted, ignored: 3 - accepted },
    ['propulsion.port.runTime', 'navigation.position'],
    'pwa',
    'batch-1'
  )
}

function listener(overrides: {
  engineHours?: () => Promise<unknown>
  position?: () => Promise<unknown>
}) {
  const calls: string[] = []
  const instance = new OnTelemetryIngested(
    {
      sync: async (...args: unknown[]) => {
        calls.push(`engine:${JSON.stringify(args)}`)
        return overrides.engineHours ? overrides.engineHours() : []
      },
    } as never,
    {
      sync: async () => {
        calls.push('position')
        return overrides.position ? overrides.position() : undefined
      },
    } as never
  )
  return { instance, calls }
}

test.group('OnTelemetryIngested', () => {
  test('synchronise heures moteur puis position pour un lot neuf', async ({ assert }) => {
    const { instance, calls } = listener({})

    await instance.handle(event(2))

    assert.deepEqual(calls, [
      `engine:${JSON.stringify([SOURCE, ['propulsion.port.runTime', 'navigation.position']])}`,
      'position',
    ])
  })

  test('ne fait rien quand tout le lot était déjà connu', async ({ assert }) => {
    const { instance, calls } = listener({})

    await instance.handle(event(0))

    assert.deepEqual(calls, [])
  })

  test('une panne des heures n’empêche ni la position ni l’ingestion', async ({ assert }) => {
    const { instance, calls } = listener({
      engineHours: async () => {
        throw new Error('boom')
      },
    })

    await instance.handle(event(1))

    assert.deepEqual(calls.at(-1), 'position')
  })

  test('une panne de la position est absorbée', async ({ assert }) => {
    const { instance } = listener({
      position: async () => {
        throw new Error('boom')
      },
    })

    await instance.handle(event(1))
    assert.isTrue(true)
  })

  test('est branché sur l’event TelemetryIngested', async ({ assert }) => {
    assert.isTrue(emitter.hasListeners(TelemetryIngested))
  })
})
