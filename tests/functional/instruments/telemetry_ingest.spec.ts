import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import emitter from '@adonisjs/core/services/emitter'
import { truncateDb } from '#tests/utils/db'
import BoatInstrumentSource from '#models/boat_instrument_source'
import BoatTelemetrySample from '#models/boat_telemetry_sample'
import TelemetryIngested from '#events/telemetry_ingested'
import {
  createAdminUser,
  createMemberUser,
  createStarterAdminUser,
} from '#tests/functional/helpers'
import { asInstrumentsReload, boatWithSource } from '#tests/functional/instruments/helpers'
import { BoatTelemetrySampleFactory } from '#database/factories/boat_telemetry_sample_factory'
import { TELEMETRY_MAX_BATCH_SIZE } from '#shared/constants/instruments'
import type { InstrumentsTabProps } from '#shared/types/instruments'

/**
 * Ingestion de télémétrie par la PWA (#988) : insertion, idempotence des
 * rejeux (D4), refus métier, isolation par organisation et lecture.
 */

function iso(minutesAgo: number) {
  return DateTime.now().minus({ minutes: minutesAgo }).startOf('second').toUTC().toISO()!
}

function sample(path: string, minutesAgo: number, value: number) {
  return { path, recordedAt: iso(minutesAgo), value }
}

async function count(sourceId?: number) {
  const query = BoatTelemetrySample.query()
  if (sourceId) query.where('sourceId', sourceId)
  const rows = await query.count('* as n')
  return Number(rows[0].$extras.n)
}

test.group('Instruments — POST boats/:boatId/telemetry', (group) => {
  group.each.setup(() => truncateDb())

  test('insère le lot, sans flash, et pose last_seen_at', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    const events = emitter.fake([TelemetryIngested])

    const response = await client
      .post(`/boats/${boat.id}/telemetry`)
      .loginAs(admin)
      .header('referer', `/boats/${boat.id}`)
      .json({
        sourceId: source!.id,
        batchId: 'batch-1',
        samples: [
          sample('navigation.speedOverGround', 5, 3.25),
          sample('propulsion.port.revolutions', 5, 41.6667),
          {
            path: 'navigation.position',
            recordedAt: iso(5),
            valueJson: { latitude: 43.29, longitude: 5.37 },
          },
        ],
      })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}`)
    assert.deepEqual(response.flashMessages(), {})
    assert.equal(await count(source!.id), 3)

    const reloaded = await BoatInstrumentSource.findOrFail(source!.id)
    assert.isNotNull(reloaded.lastSeenAt)
    events.assertEmitted(TelemetryIngested)
    emitter.restore()
  })

  test('un lot rejoué n’insère rien de plus (ON CONFLICT DO NOTHING)', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    const payload = {
      sourceId: source!.id,
      batchId: 'batch-1',
      samples: [
        sample('navigation.speedOverGround', 5, 3.25),
        sample('navigation.speedOverGround', 4, 3.5),
      ],
    }

    for (let i = 0; i < 2; i++) {
      const response = await client
        .post(`/boats/${boat.id}/telemetry`)
        .loginAs(admin)
        .json(payload)
        .redirects(0)
      response.assertStatus(302)
    }
    assert.equal(await count(source!.id), 2)

    // Un lot qui chevauche : seul l'échantillon neuf est ajouté.
    await client
      .post(`/boats/${boat.id}/telemetry`)
      .loginAs(admin)
      .json({
        ...payload,
        batchId: 'batch-2',
        samples: [...payload.samples, sample('navigation.speedOverGround', 3, 4)],
      })
      .redirects(0)
    assert.equal(await count(source!.id), 3)
  })

  test('refus métier : message flashé, rien d’écrit', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    const post = (body: object) =>
      client.post(`/boats/${boat.id}/telemetry`).loginAs(admin).json(body).redirects(0)

    const unknownPath = await post({
      sourceId: source!.id,
      batchId: 'b',
      samples: [sample('design.length', 5, 1)],
    })
    assert.include(String(unknownPath.flashMessage('error')), 'unsupported')
    unknownPath.assertFlashMessage('rejectedType', 'ingest-telemetry')

    const future = await post({
      sourceId: source!.id,
      batchId: 'b',
      samples: [{ path: 'navigation.speedOverGround', recordedAt: iso(-30), value: 1 }],
    })
    assert.include(String(future.flashMessage('error')), 'timestamp')

    const wrongSource = await post({
      sourceId: source!.id + 999,
      batchId: 'b',
      samples: [sample('navigation.speedOverGround', 5, 1)],
    })
    assert.include(String(wrongSource.flashMessage('error')), 'no instruments source')

    const tooMany = await post({
      sourceId: source!.id,
      batchId: 'b',
      samples: Array.from({ length: TELEMETRY_MAX_BATCH_SIZE }, (_, i) =>
        sample('navigation.speedOverGround', 5 + i, 1)
      ),
    })
    assert.isUndefined(tooMany.flashMessage('error'))

    assert.equal(await count(source!.id), TELEMETRY_MAX_BATCH_SIZE)
  })

  test('un lot de plus de 500 échantillons est rejeté par le validateur', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)

    const response = await client
      .post(`/boats/${boat.id}/telemetry`)
      .loginAs(admin)
      .json({
        sourceId: source!.id,
        batchId: 'b',
        samples: Array.from({ length: TELEMETRY_MAX_BATCH_SIZE + 1 }, (_, i) =>
          sample('navigation.speedOverGround', 5 + i, 1)
        ),
      })
      .redirects(0)

    response.assertStatus(302)
    assert.equal(await count(), 0)
  })

  test('source désactivée : refus', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    source!.enabled = false
    await source!.save()

    const response = await client
      .post(`/boats/${boat.id}/telemetry`)
      .loginAs(admin)
      .json({
        sourceId: source!.id,
        batchId: 'b',
        samples: [sample('navigation.speedOverGround', 5, 1)],
      })
      .redirects(0)

    assert.include(String(response.flashMessage('error')), 'disabled')
    assert.equal(await count(), 0)
  })

  test('un member peut ingérer, pas un compte sans droit d’édition ni un Starter', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const { boat, source } = await boatWithSource(admin)
    const body = {
      sourceId: source!.id,
      batchId: 'b',
      samples: [sample('navigation.speedOverGround', 5, 1)],
    }

    await client.post(`/boats/${boat.id}/telemetry`).loginAs(member).json(body).redirects(0)
    assert.equal(await count(), 1)

    const starter = await createStarterAdminUser()
    const starterBoat = await boatWithSource(starter)
    const refused = await client
      .post(`/boats/${starterBoat.boat.id}/telemetry`)
      .loginAs(starter)
      .json({ ...body, sourceId: starterBoat.source!.id })
      .redirects(0)
    refused.assertHeader('location', '/settings/billing')
  })

  test('une autre organisation ne peut pas écrire sur ce bateau', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const attacker = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)

    const response = await client
      .post(`/boats/${boat.id}/telemetry`)
      .loginAs(attacker)
      .json({
        sourceId: source!.id,
        batchId: 'b',
        samples: [sample('navigation.speedOverGround', 5, 1)],
      })
      .redirects(0)

    response.assertHeader('location', '/boats')
    assert.equal(await count(), 0)
  })

  test('la prop différée sert dernières valeurs et série récente en nombres', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    await BoatTelemetrySampleFactory.merge({
      boatId: boat.id,
      sourceId: source!.id,
      path: 'navigation.speedOverGround',
      recordedAt: DateTime.now().minus({ minutes: 10 }),
      value: '2.5',
    }).create()
    await BoatTelemetrySampleFactory.merge({
      boatId: boat.id,
      sourceId: source!.id,
      path: 'navigation.speedOverGround',
      recordedAt: DateTime.now().minus({ minutes: 1 }),
      value: '3.5',
    }).create()
    await BoatTelemetrySampleFactory.merge({
      boatId: boat.id,
      sourceId: source!.id,
      path: 'navigation.speedOverGround',
      recordedAt: DateTime.now().minus({ minutes: 120 }),
      value: '9',
    }).create()
    await BoatTelemetrySampleFactory.merge({
      boatId: boat.id,
      sourceId: source!.id,
      path: 'navigation.position',
      recordedAt: DateTime.now().minus({ minutes: 2 }),
      value: null,
      valueJson: { latitude: 43.2, longitude: 5.3 },
    }).create()

    const response = await asInstrumentsReload(client.get(`/boats/${boat.id}`).loginAs(admin))

    const { instruments } = response.inertiaProps as { instruments: InstrumentsTabProps }
    const speed = instruments.latest.find((v) => v.path === 'navigation.speedOverGround')
    assert.strictEqual(speed?.value, 3.5)
    const position = instruments.latest.find((v) => v.path === 'navigation.position')
    assert.deepEqual(position?.valueJson, { latitude: 43.2, longitude: 5.3 })
    assert.deepEqual(
      instruments.recent['navigation.speedOverGround'].map(([, v]) => v),
      [2.5, 3.5]
    )
    assert.notProperty(instruments.recent, 'navigation.position')
  })

  test('cascade : supprimer la source supprime ses échantillons', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    await client
      .post(`/boats/${boat.id}/telemetry`)
      .loginAs(admin)
      .json({
        sourceId: source!.id,
        batchId: 'b',
        samples: [sample('navigation.speedOverGround', 5, 1)],
      })
      .redirects(0)
    assert.equal(await count(), 1)

    await client.delete(`/boats/${boat.id}/instrument-source`).loginAs(admin).redirects(0)
    assert.equal(await count(), 0)
  })
})
