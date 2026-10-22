import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import BoatInstrumentAlert from '#models/boat_instrument_alert'
import BoatInstrumentSource from '#models/boat_instrument_source'
import BoatTelemetrySample from '#models/boat_telemetry_sample'
import InstrumentIngestTokenService from '#services/instrument_ingest_token_service'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser, createStarterAdminUser } from '#tests/functional/helpers'
import { boatWithSource } from '#tests/functional/instruments/helpers'

/**
 * `POST /api/instruments/ingest` (#994) : le plugin Signal K pousse un lot
 * authentifié par le jeton de la source. Pas de session, pas de CSRF.
 */

const URL = '/api/instruments/ingest'
const SOG = 'navigation.speedOverGround'
let counter = 0

function at(minutesAgo: number) {
  return DateTime.now().minus({ minutes: minutesAgo }).startOf('second').toUTC().toISO()!
}

function batch(overrides: Record<string, unknown> = {}) {
  counter += 1
  return {
    batchId: `plugin-${counter}`,
    samples: [{ path: SOG, recordedAt: at(counter + 1), value: 3.2 }],
    ...overrides,
  }
}

async function setup(plan: 'pro' | 'starter' = 'pro') {
  const admin = plan === 'pro' ? await createAdminUser() : await createStarterAdminUser()
  const { boat, source } = await boatWithSource(admin)
  const tokens = await app.container.make(InstrumentIngestTokenService)
  const token = await tokens.issueForBoat(boat)
  return { admin, boat, source: source!, token, tokens }
}

test.group('API — ingestion du plugin (#994)', (group) => {
  group.each.setup(() => truncateDb())

  test('un lot avec un jeton valide est écrit, origine plugin, dernière réception posée', async ({
    client,
    assert,
  }) => {
    const { boat, source, token } = await setup()

    const response = await client.post(URL).header('Authorization', `Bearer ${token}`).json(batch())

    response.assertStatus(200)
    response.assertBodyContains({ accepted: 1, ignored: 0 })
    const samples = await BoatTelemetrySample.query().where('boatId', boat.id)
    assert.lengthOf(samples, 1)
    assert.equal(samples[0].sourceId, source.id)
    assert.equal(samples[0].path, SOG)
    const refreshed = await BoatInstrumentSource.findOrFail(source.id)
    assert.isNotNull(refreshed.lastSeenAt)
  })

  test('sourceId est facultatif ; fourni, il doit être celui du jeton', async ({
    client,
    assert,
  }) => {
    const { source, token } = await setup()
    const ok = await client
      .post(URL)
      .header('Authorization', `Bearer ${token}`)
      .json(batch({ sourceId: source.id }))
    ok.assertStatus(200)

    const mismatch = await client
      .post(URL)
      .header('Authorization', `Bearer ${token}`)
      .json(batch({ sourceId: source.id + 999 }))
    mismatch.assertStatus(422)
    mismatch.assertBodyContains({ error: 'source_mismatch' })
    assert.equal(
      await BoatTelemetrySample.query()
        .count('* as n')
        .then((rows) => Number(rows[0].$extras.n)),
      1
    )
  })

  test('un lot rejoué est idempotent : accepted 0, ignored n', async ({ client }) => {
    const { token } = await setup()
    const body = batch()

    await client.post(URL).header('Authorization', `Bearer ${token}`).json(body)
    const replay = await client.post(URL).header('Authorization', `Bearer ${token}`).json(body)

    replay.assertStatus(200)
    replay.assertBodyContains({ accepted: 0, ignored: 1 })
  })

  test('le lot déclenche les effets métier : une alerte s’ouvre', async ({ client, assert }) => {
    const { boat, token } = await setup()

    await client
      .post(URL)
      .header('Authorization', `Bearer ${token}`)
      .json(
        batch({
          samples: [
            {
              path: 'electrical.batteries.house.capacity.stateOfCharge',
              recordedAt: at(1),
              value: 0.1,
            },
          ],
        })
      )

    const alert = await BoatInstrumentAlert.query().where('boatId', boat.id).firstOrFail()
    assert.equal(alert.ruleKey, 'builtin:battery_low')
  })

  test('401 sans jeton, avec un jeton inconnu, mal formé ou d’un autre schéma', async ({
    client,
  }) => {
    await setup()
    const headers = [
      undefined,
      'Bearer fai_ing_inconnu',
      'Bearer pas-un-jeton',
      'Basic dXNlcjpwYXNz',
      'Bearer',
    ]
    for (const header of headers) {
      const request = client.post(URL).json(batch())
      if (header) request.header('Authorization', header)
      const response = await request
      response.assertStatus(401)
      response.assertBodyContains({ error: 'unauthorized' })
      response.assertHeader('www-authenticate', 'Bearer realm="instruments"')
    }
  })

  test('401 après révocation, et l’ancien jeton ne marche plus après rotation', async ({
    client,
  }) => {
    const { boat, token, tokens } = await setup()
    const rotated = await tokens.issueForBoat(boat)

    const old = await client.post(URL).header('Authorization', `Bearer ${token}`).json(batch())
    old.assertStatus(401)
    const fresh = await client.post(URL).header('Authorization', `Bearer ${rotated}`).json(batch())
    fresh.assertStatus(200)

    await tokens.revokeForBoat(boat)
    const revoked = await client
      .post(URL)
      .header('Authorization', `Bearer ${rotated}`)
      .json(batch())
    revoked.assertStatus(401)
  })

  test('409 quand la source est désactivée, rien n’est écrit', async ({ client, assert }) => {
    const { source, token } = await setup()
    source.enabled = false
    await source.save()

    const response = await client.post(URL).header('Authorization', `Bearer ${token}`).json(batch())

    response.assertStatus(409)
    response.assertBodyContains({ error: 'source_disabled' })
    assert.equal(
      await BoatTelemetrySample.query()
        .count('* as n')
        .then((rows) => Number(rows[0].$extras.n)),
      0
    )
  })

  test('403 quand le plan de l’organisation n’ouvre plus les instruments', async ({ client }) => {
    const { token } = await setup('starter')

    const response = await client.post(URL).header('Authorization', `Bearer ${token}`).json(batch())

    response.assertStatus(403)
    response.assertBodyContains({ error: 'plan_not_allowed' })
  })

  test('422 sur une forme invalide, un chemin hors catalogue ou une date future', async ({
    client,
  }) => {
    const { token } = await setup()
    const post = (body: unknown) =>
      client
        .post(URL)
        .header('Authorization', `Bearer ${token}`)
        .json(body as object)

    const empty = await post({ batchId: 'x', samples: [] })
    empty.assertStatus(422)
    empty.assertBodyContains({ error: 'validation_failed' })

    const noBatch = await post({ samples: [{ path: SOG, recordedAt: at(1), value: 1 }] })
    noBatch.assertStatus(422)

    const path = await post(
      batch({ samples: [{ path: 'design.length', recordedAt: at(1), value: 1 }] })
    )
    path.assertStatus(422)
    path.assertBodyContains({ error: 'path_not_allowed', path: 'design.length' })

    const future = await post(
      batch({
        samples: [
          {
            path: SOG,
            recordedAt: DateTime.now().plus({ hours: 2 }).toUTC().toISO(),
            value: 1,
          },
        ],
      })
    )
    future.assertStatus(422)
    future.assertBodyContains({ error: 'recorded_at_invalid' })

    const kind = await post(
      batch({ samples: [{ path: SOG, recordedAt: at(1), valueJson: { a: 1 } }] })
    )
    kind.assertStatus(422)
    kind.assertBodyContains({ error: 'value_invalid' })
  })

  test('413 est tenu par la validation : plus de 500 échantillons → 422', async ({ client }) => {
    const { token } = await setup()
    const samples = Array.from({ length: 501 }, (_, index) => ({
      path: SOG,
      recordedAt: at(index + 1),
      value: 1,
    }))

    const response = await client
      .post(URL)
      .header('Authorization', `Bearer ${token}`)
      .json(batch({ samples }))

    response.assertStatus(422)
  })

  test('le limiteur par source répond 429 en JSON au-delà de 30 lots par minute', async ({
    client,
    assert,
  }) => {
    const { token } = await setup()
    let last: Awaited<ReturnType<ReturnType<typeof client.post>['json']>> | null = null
    for (let index = 0; index < 31; index += 1) {
      last = await client.post(URL).header('Authorization', `Bearer ${token}`).json(batch())
    }

    last!.assertStatus(429)
    last!.assertBodyContains({ error: 'rate_limited' })
    assert.isNotEmpty(last!.header('retry-after'))
  })

  test('le jeton d’une source ne lit ni n’écrit sur une autre', async ({ client, assert }) => {
    const first = await setup()
    const second = await setup()

    await client.post(URL).header('Authorization', `Bearer ${first.token}`).json(batch())

    assert.equal(
      await BoatTelemetrySample.query()
        .where('boatId', second.boat.id)
        .count('* as n')
        .then((rows) => Number(rows[0].$extras.n)),
      0
    )
  })

  test('le limiteur par IP borne les essais de jeton : 401 puis 429 au-delà de 120 par minute', async ({
    client,
  }) => {
    let last: Awaited<ReturnType<ReturnType<typeof client.post>['json']>> | null = null
    for (let index = 0; index < 121; index += 1) {
      last = await client.post(URL).header('Authorization', 'Bearer fai_ing_devine').json(batch())
      if (index < 120) last.assertStatus(401)
    }
    last!.assertStatus(429)
    last!.assertBodyContains({ error: 'rate_limited' })
  })
})
