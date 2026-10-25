import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser, createStarterAdminUser } from '#tests/functional/helpers'
import { asInstrumentsReload, boatWithSource } from '#tests/functional/instruments/helpers'
import { BoatAisSightingFactory } from '#database/factories/boat_ais_sighting_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatInstrumentSourceFactory } from '#database/factories/boat_instrument_source_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import InstrumentIngestTokenService from '#services/instrument_ingest_token_service'
import { TELEMETRY_MAX_BATCH_SIZE } from '#shared/constants/instruments'
import type { InstrumentsTabProps } from '#shared/types/instruments'

/**
 * Ingestion de cibles AIS (#1009) : lot mixte mesures+AIS, lot AIS seul,
 * idempotence, rejets, et lecture de la prop différée `instruments.aisTargets`.
 */

function isoAgo(minutesAgo: number) {
  return DateTime.now().minus({ minutes: minutesAgo }).startOf('second').toUTC().toISO()!
}

const VALID_AIS_VALUE = {
  name: 'CARGO SHIP',
  latitude: 43.29,
  longitude: 5.37,
  sogMs: 3.5,
  cogRad: 1.2,
  shipType: 70,
  shipTypeName: 'Cargo',
  cpaM: null,
  tcpaS: null,
}

function aisSample(mmsi: string, minutesAgo = 5, overrides: object = {}) {
  return {
    path: `ais.${mmsi}`,
    recordedAt: isoAgo(minutesAgo),
    valueJson: { ...VALID_AIS_VALUE, ...overrides },
  }
}

function speedSample(minutesAgo = 5) {
  return { path: 'navigation.speedOverGround', recordedAt: isoAgo(minutesAgo), value: 3.25 }
}

async function countAisSightings(boatId?: number) {
  const query = db.from('boat_ais_sightings')
  if (boatId !== undefined) query.where('boat_id', boatId)
  const rows = await query.count('* as n')
  return Number(rows[0].n)
}

async function countTelemetrySamples(boatId?: number) {
  const query = db.from('boat_telemetry_samples')
  if (boatId !== undefined) query.where('boat_id', boatId)
  const rows = await query.count('* as n')
  return Number(rows[0].n)
}

// ---------------------------------------------------------------------------
// PWA — POST /boats/:boatId/telemetry
// ---------------------------------------------------------------------------

test.group('AIS ingest — POST boats/:boatId/telemetry (PWA)', (group) => {
  group.each.setup(() => truncateDb())

  test('lot mixte mesures+AIS : insère les deux tables', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)

    const response = await client
      .post(`/boats/${boat.id}/telemetry`)
      .loginAs(admin)
      .json({
        sourceId: source!.id,
        batchId: 'b-ais-1',
        samples: [speedSample(5), aisSample('244630000', 5)],
      })
      .redirects(0)

    response.assertStatus(302)
    assert.equal(await countTelemetrySamples(boat.id), 1)
    assert.equal(await countAisSightings(boat.id), 1)
  })

  test('lot AIS seul : insère uniquement boat_ais_sightings', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)

    const response = await client
      .post(`/boats/${boat.id}/telemetry`)
      .loginAs(admin)
      .json({
        sourceId: source!.id,
        batchId: 'b-ais-2',
        samples: [aisSample('244630000', 5), aisSample('333333333', 4)],
      })
      .redirects(0)

    response.assertStatus(302)
    assert.equal(await countTelemetrySamples(boat.id), 0)
    assert.equal(await countAisSightings(boat.id), 2)
  })

  test('rejeu idempotent : ON CONFLICT DO NOTHING', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    const payload = {
      sourceId: source!.id,
      batchId: 'b-ais-3',
      samples: [aisSample('244630000', 5)],
    }

    for (let i = 0; i < 2; i++) {
      const r = await client
        .post(`/boats/${boat.id}/telemetry`)
        .loginAs(admin)
        .json(payload)
        .redirects(0)
      r.assertStatus(302)
    }

    assert.equal(await countAisSightings(boat.id), 1)
  })

  test('cible invalide (position absente) : lot entier refusé, rien n’est écrit', async ({
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
        batchId: 'b-ais-bad',
        samples: [
          speedSample(5),
          {
            path: 'ais.244630000',
            recordedAt: isoAgo(5),
            valueJson: { name: 'NO POSITION', sogMs: null },
          },
        ],
      })
      .redirects(0)

    response.assertStatus(302)
    assert.exists(response.flashMessages().error)
    assert.equal(await countTelemetrySamples(boat.id), 0)
    assert.equal(await countAisSightings(boat.id), 0)
  })

  test('lot >500 échantillons total (mesures + AIS) : rejeté', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)

    const response = await client
      .post(`/boats/${boat.id}/telemetry`)
      .loginAs(admin)
      .json({
        sourceId: source!.id,
        batchId: 'b-big',
        samples: Array.from({ length: TELEMETRY_MAX_BATCH_SIZE + 1 }, (_, i) =>
          aisSample(String(100000000 + i).padStart(9, '0'), 5 + i)
        ),
      })
      .redirects(0)

    response.assertStatus(302)
    assert.equal(await countAisSightings(boat.id), 0)
  })

  test('chemin ais.abc (MMSI invalide) : refusé comme chemin hors liste blanche', async ({
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
        batchId: 'b-bad-mmsi',
        samples: [{ path: 'ais.abc', recordedAt: isoAgo(5), value: 1 }],
      })
      .redirects(0)

    response.assertStatus(302)
    assert.exists(response.flashMessages().error)
    assert.equal(await countAisSightings(boat.id), 0)
  })
})

// ---------------------------------------------------------------------------
// Plugin — POST /api/instruments/ingest
// ---------------------------------------------------------------------------

async function issueToken(boatId: number): Promise<string> {
  const tokenService = await app.container.make(InstrumentIngestTokenService)
  return tokenService.issueForBoat({ id: boatId })
}

test.group('AIS ingest — POST /api/instruments/ingest (plugin)', (group) => {
  group.each.setup(() => truncateDb())

  test('lot mixte mesures+AIS : 200 avec accepted/ignored', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    const token = await issueToken(boat.id)

    const response = await client
      .post('/api/instruments/ingest')
      .header('Authorization', `Bearer ${token}`)
      .json({
        sourceId: source!.id,
        batchId: 'api-1',
        samples: [speedSample(5), aisSample('244630000', 5)],
      })

    response.assertStatus(200)
    const body = response.body() as { accepted: number; ignored: number }
    assert.equal(body.accepted, 2)
    assert.equal(body.ignored, 0)
    assert.equal(await countTelemetrySamples(boat.id), 1)
    assert.equal(await countAisSightings(boat.id), 1)
  })

  test('lot AIS seul : insère boat_ais_sightings uniquement', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    const token = await issueToken(boat.id)

    const response = await client
      .post('/api/instruments/ingest')
      .header('Authorization', `Bearer ${token}`)
      .json({
        sourceId: source!.id,
        batchId: 'api-ais-only',
        samples: [aisSample('111111111', 5), aisSample('222222222', 4)],
      })

    response.assertStatus(200)
    assert.equal(await countAisSightings(boat.id), 2)
    assert.equal(await countTelemetrySamples(boat.id), 0)
  })

  test('rejeu idempotent : accepted=0, ignored=1', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    const token = await issueToken(boat.id)
    const payload = {
      sourceId: source!.id,
      batchId: 'api-idem',
      samples: [aisSample('244630000', 5)],
    }

    await client
      .post('/api/instruments/ingest')
      .header('Authorization', `Bearer ${token}`)
      .json(payload)
    const second = await client
      .post('/api/instruments/ingest')
      .header('Authorization', `Bearer ${token}`)
      .json(payload)

    second.assertStatus(200)
    const body = second.body() as { accepted: number; ignored: number }
    assert.equal(body.accepted, 0)
    assert.equal(body.ignored, 1)
    assert.equal(await countAisSightings(boat.id), 1)
  })

  test('cible invalide : 422 value_invalid, rien n’est écrit', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    const token = await issueToken(boat.id)

    const response = await client
      .post('/api/instruments/ingest')
      .header('Authorization', `Bearer ${token}`)
      .json({
        sourceId: source!.id,
        batchId: 'api-bad',
        samples: [
          speedSample(5),
          {
            path: 'ais.244630000',
            recordedAt: isoAgo(5),
            valueJson: { name: 'NO POSITION', sogMs: null },
          },
        ],
      })

    response.assertStatus(422)
    const body = response.body() as { error: string }
    assert.equal(body.error, 'value_invalid')
    assert.equal(await countTelemetrySamples(boat.id), 0)
    assert.equal(await countAisSightings(boat.id), 0)
  })

  test('lot >500 : le validateur retourne 422, rien n’est écrit', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    const token = await issueToken(boat.id)

    const response = await client
      .post('/api/instruments/ingest')
      .header('Authorization', `Bearer ${token}`)
      .json({
        sourceId: source!.id,
        batchId: 'api-big',
        samples: Array.from({ length: TELEMETRY_MAX_BATCH_SIZE + 1 }, (_, i) =>
          aisSample(String(100000000 + i).padStart(9, '0'), 5 + i)
        ),
      })

    // VineJS .maxLength(500) intercepte avant le service — 422 validation_failed, pas 413.
    response.assertStatus(422)
    assert.equal(await countAisSightings(boat.id), 0)
  })

  test('sans jeton : 401', async ({ client }) => {
    const response = await client
      .post('/api/instruments/ingest')
      .json({ batchId: 'no-auth', samples: [] })

    response.assertStatus(401)
  })

  test('plan Starter : 403 plan_not_allowed', async ({ client, assert }) => {
    const starter = await createStarterAdminUser()
    const organization = await OrganizationFactory.merge({
      plan: 'starter',
    }).create()
    const boat = await BoatFactory.merge({ organizationId: organization.id }).create()
    const source = await BoatInstrumentSourceFactory.merge({
      boatId: boat.id,
      organizationId: organization.id,
      baseUrl: 'https://signalk.example:3443',
    }).create()

    // Forcer un token même si le plan n’ouvre pas les instruments normalement
    const tokenService = await app.container.make(InstrumentIngestTokenService)
    const token = await tokenService.issueForBoat({ id: boat.id })

    const response = await client
      .post('/api/instruments/ingest')
      .header('Authorization', `Bearer ${token}`)
      .json({
        sourceId: source.id,
        batchId: 'starter-test',
        samples: [aisSample('244630000', 5)],
      })

    response.assertStatus(403)
    assert.equal(await countAisSightings(boat.id), 0)

    // Évite la confusion avec les autres assertions
    void starter
  })
})

// ---------------------------------------------------------------------------
// Prop différée instruments.aisTargets
// ---------------------------------------------------------------------------

test.group('AIS — prop différée instruments.aisTargets', (group) => {
  group.each.setup(() => truncateDb())

  test('retourne les cibles vues dans les 30 dernières minutes, dédupliquées par MMSI', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)

    // Deux relevés pour le même MMSI : seul le plus récent doit apparaître
    await BoatAisSightingFactory.merge({
      boatId: boat.id,
      sourceId: source!.id,
      mmsi: '244630000',
      recordedAt: DateTime.now().minus({ minutes: 20 }),
      name: 'OLD NAME',
    }).create()
    await BoatAisSightingFactory.merge({
      boatId: boat.id,
      sourceId: source!.id,
      mmsi: '244630000',
      recordedAt: DateTime.now().minus({ minutes: 5 }),
      name: 'NEW NAME',
    }).create()
    // Deuxième cible différente
    await BoatAisSightingFactory.merge({
      boatId: boat.id,
      sourceId: source!.id,
      mmsi: '333333333',
      recordedAt: DateTime.now().minus({ minutes: 10 }),
      name: 'OTHER',
    }).create()

    const response = await asInstrumentsReload(client.get(`/boats/${boat.id}`).loginAs(admin))
    const { instruments } = response.inertiaProps as { instruments: InstrumentsTabProps }

    assert.lengthOf(instruments.aisTargets, 2)
    const first = instruments.aisTargets.find((t) => t.mmsi === '244630000')
    assert.equal(first?.name, 'NEW NAME')
  })

  test('les relevés plus vieux que 30 min n’apparaissent pas', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)

    await BoatAisSightingFactory.merge({
      boatId: boat.id,
      sourceId: source!.id,
      mmsi: '244630000',
      recordedAt: DateTime.now().minus({ minutes: 31 }),
    }).create()

    const response = await asInstrumentsReload(client.get(`/boats/${boat.id}`).loginAs(admin))
    const { instruments } = response.inertiaProps as { instruments: InstrumentsTabProps }

    assert.lengthOf(instruments.aisTargets, 0)
  })

  test('les relevés d’un autre bateau/organisation ne sont pas exposés', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const other = await createAdminUser()
    const { boat } = await boatWithSource(admin)
    const { boat: otherBoat, source: otherSource } = await boatWithSource(other)

    await BoatAisSightingFactory.merge({
      boatId: otherBoat.id,
      sourceId: otherSource!.id,
      mmsi: '244630000',
      recordedAt: DateTime.now().minus({ minutes: 5 }),
    }).create()

    const response = await asInstrumentsReload(client.get(`/boats/${boat.id}`).loginAs(admin))
    const { instruments } = response.inertiaProps as { instruments: InstrumentsTabProps }

    assert.lengthOf(instruments.aisTargets, 0)
  })

  test('plan Starter : aisTargets est un tableau vide', async ({ client, assert }) => {
    const starter = await createStarterAdminUser()
    const { boat } = await boatWithSource(starter, false)

    const response = await asInstrumentsReload(client.get(`/boats/${boat.id}`).loginAs(starter))
    const { instruments } = response.inertiaProps as { instruments: InstrumentsTabProps }

    assert.deepEqual(instruments.aisTargets, [])
  })
})
