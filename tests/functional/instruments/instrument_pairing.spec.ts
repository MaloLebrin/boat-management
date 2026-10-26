import { createHash } from 'node:crypto'
import type { ApiClient } from '@japa/api-client'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'
import BoatInstrumentSource from '#models/boat_instrument_source'
import InstrumentPairing from '#models/instrument_pairing'
import PurgeInstrumentPairings from '#jobs/purge_instrument_pairings'
import { InstrumentPairingFactory } from '#database/factories/instrument_pairing_factory'
import { truncateDb } from '#tests/utils/db'
import {
  createAdminUser,
  createMemberUser,
  createStarterAdminUser,
} from '#tests/functional/helpers'
import { boatWithSource } from '#tests/functional/instruments/helpers'
import {
  INSTRUMENT_INGEST_TOKEN_PREFIX,
  INSTRUMENT_PAIRING_ATTEMPT_LIMIT,
  INSTRUMENT_PAIRING_DELIVERY_GRACE_SECONDS,
  INSTRUMENT_PAIRING_DEVICE_CODE_PREFIX,
  INSTRUMENT_PAIRING_PATH,
  INSTRUMENT_PAIRING_POLL_PATH,
  INSTRUMENT_PAIRING_TTL_SECONDS,
  INSTRUMENT_SETUP_PLUGIN_PLACEHOLDER_URL,
} from '#shared/constants/instruments'
import type User from '#models/user'
import type { InstrumentPairingCreated } from '#shared/types/instruments'

/**
 * Appairage par code du boîtier Signal K (#1032, D11) : création et
 * interrogation sans authentification, rattachement par un admin Pro.
 */

const USER_CODE = /^[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}$/

type Client = ApiClient

async function createPairing(
  client: Client,
  body: Record<string, unknown> = {},
  ip = '198.18.0.1'
) {
  const response = await client
    .post(INSTRUMENT_PAIRING_PATH)
    .header('X-Forwarded-For', ip)
    .json(body)
  const created = response.body() as InstrumentPairingCreated
  return { response, created }
}

function poll(client: Client, deviceCode: string) {
  return client.post(INSTRUMENT_PAIRING_POLL_PATH).json({ deviceCode })
}

function attach(client: Client, boatId: number, userCode: string, user: User) {
  return client
    .post(`/boats/${boatId}/instrument-source/pairing`)
    .loginAs(user)
    .header('referer', `/boats/${boatId}`)
    .redirects(0)
    .form({ userCode })
}

async function firstPairing() {
  return InstrumentPairing.query().orderBy('id').firstOrFail()
}

async function ingestHashOf(sourceId: number) {
  const source = await BoatInstrumentSource.findOrFail(sourceId)
  return source.ingestTokenHash
}

async function pollBody<T = Record<string, unknown>>(client: Client, deviceCode: string) {
  const response = await poll(client, deviceCode)
  return response.body() as T
}

async function pairingRows() {
  return InstrumentPairing.query().orderBy('id')
}

test.group('Instruments — appairage : création (#1032)', (group) => {
  group.each.setup(() => truncateDb())

  test('crée un appairage sans authentification et rend les deux codes', async ({
    client,
    assert,
  }) => {
    const { response, created } = await createPairing(client, {
      deviceLabel: 'fleetai-3f2a',
      hardwareKind: 'raspberry_pi',
      pluginVersion: '0.2.0',
    })

    response.assertStatus(201)
    assert.equal(response.header('cache-control'), 'no-store')
    assert.match(created.userCode, USER_CODE)
    assert.isTrue(created.deviceCode.startsWith(INSTRUMENT_PAIRING_DEVICE_CODE_PREFIX))
    assert.isAbove(created.deviceCode.length, 40)
    assert.equal(created.expiresIn, INSTRUMENT_PAIRING_TTL_SECONDS)
    assert.isAbove(created.interval, 0)

    const [row] = await pairingRows()
    assert.equal(row.deviceLabel, 'fleetai-3f2a')
    assert.equal(row.hardwareKind, 'raspberry_pi')
    assert.equal(row.pluginVersion, '0.2.0')
    assert.isNull(row.boatId)
    assert.isNull(row.organizationId)
    assert.isNull(row.claimedByUserId)
    assert.isNull(row.approvedAt)
    assert.approximately(
      row.expiresAt.diffNow('seconds').seconds,
      INSTRUMENT_PAIRING_TTL_SECONDS,
      5
    )
  })

  test('les champs facultatifs le sont vraiment ; deux appairages ont des codes distincts', async ({
    client,
    assert,
  }) => {
    const first = await createPairing(client)
    const second = await createPairing(client)

    first.response.assertStatus(201)
    second.response.assertStatus(201)
    assert.notEqual(first.created.userCode, second.created.userCode)
    assert.notEqual(first.created.deviceCode, second.created.deviceCode)
    const rows = await pairingRows()
    assert.isNull(rows[0].deviceLabel)
    assert.isNull(rows[0].hardwareKind)
  })

  test('refuse des champs mal formés', async ({ client, assert }) => {
    const badKind = await createPairing(client, { hardwareKind: 'Raspberry Pi!' })
    const longLabel = await createPairing(client, { deviceLabel: 'x'.repeat(81) })
    const controlChars = await createPairing(client, { deviceLabel: 'a\u0000b' })

    badKind.response.assertStatus(422)
    longLabel.response.assertStatus(422)
    controlChars.response.assertStatus(422)
    assert.deepEqual(badKind.response.body().error, 'validation_failed')
    assert.lengthOf(await pairingRows(), 0)
  })

  test('limite le débit par IP, sans écrire au-delà', async ({ client, assert }) => {
    for (let index = 0; index < 10; index++) {
      const { response } = await createPairing(client, {}, '198.18.0.50')
      response.assertStatus(201)
    }
    const { response } = await createPairing(client, {}, '198.18.0.50')
    response.assertStatus(429)
    assert.lengthOf(await pairingRows(), 10)

    const otherIp = await createPairing(client, {}, '198.18.0.51')
    otherIp.response.assertStatus(201)
  })

  test('ne demande pas de jeton CSRF', async ({ client }) => {
    const response = await client.post(INSTRUMENT_PAIRING_PATH).json({})
    response.assertStatus(201)
  })
})

test.group('Instruments — appairage : interrogation (#1032)', (group) => {
  group.each.setup(() => truncateDb())

  test('pending tant que personne n’a saisi le code', async ({ client, assert }) => {
    const { created } = await createPairing(client)

    const response = await poll(client, created.deviceCode)

    response.assertStatus(200)
    assert.equal(response.body().status, 'pending')
    assert.isAbove(response.body().interval, 0)
    assert.isUndefined(response.body().token)
  })

  test('un deviceCode inconnu ou mal formé n’est jamais pending', async ({ client, assert }) => {
    const unknown = await poll(client, `${INSTRUMENT_PAIRING_DEVICE_CODE_PREFIX}inconnu`)
    const wrongPrefix = await poll(client, 'nope')
    const tooLong = await poll(client, 'x'.repeat(500))

    unknown.assertStatus(200)
    assert.deepEqual(unknown.body(), { status: 'expired' })
    assert.deepEqual(wrongPrefix.body(), { status: 'expired' })
    tooLong.assertStatus(422)
    const missing = await client.post(INSTRUMENT_PAIRING_POLL_PATH).json({})
    missing.assertStatus(422)
  })

  test('expired quand le délai est passé', async ({ client, assert }) => {
    const { created } = await createPairing(client)
    await InstrumentPairing.query().update({ expiresAt: DateTime.now().minus({ minutes: 1 }) })

    const response = await poll(client, created.deviceCode)

    assert.deepEqual(response.body(), { status: 'expired' })
  })

  test('approved livre le jeton une seule fois ; il ne reste jamais en clair', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    const { created } = await createPairing(client, { deviceLabel: 'fleetai-3f2a' })
    await attach(client, boat.id, created.userCode, admin)

    const delivered = await poll(client, created.deviceCode)

    delivered.assertStatus(200)
    const { status, token } = delivered.body() as { status: string; token: string }
    assert.equal(status, 'approved')
    assert.isTrue(token.startsWith(INSTRUMENT_INGEST_TOKEN_PREFIX))
    const stored = await BoatInstrumentSource.findOrFail(source!.id)
    assert.equal(stored.ingestTokenHash, createHash('sha256').update(token).digest('hex'))
    assert.isNotNull(stored.ingestTokenIssuedAt)

    // Rien, nulle part, ne contient le jeton ni les codes en clair.
    const dump = JSON.stringify({
      pairings: await db.from('instrument_pairings').select('*'),
      sources: await db.from('boat_instrument_sources').select('*'),
      audit: await db.from('audit_logs').select('*'),
    })
    for (const secret of [
      token,
      created.deviceCode,
      created.userCode,
      created.userCode.replace('-', ''),
    ]) {
      assert.notInclude(dump, secret)
    }

    const again = await poll(client, created.deviceCode)
    assert.deepEqual(again.body(), { status: 'expired' })
    assert.notInclude(JSON.stringify(again.body()), INSTRUMENT_INGEST_TOKEN_PREFIX)
    const after = await BoatInstrumentSource.findOrFail(source!.id)
    assert.equal(after.ingestTokenHash, stored.ingestTokenHash)
  })

  test('le jeton livré authentifie bien l’ingestion', async ({ client }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin)
    const { created } = await createPairing(client)
    await attach(client, boat.id, created.userCode, admin)
    const delivery = await pollBody<{ token: string }>(client, created.deviceCode)
    const { token } = delivery

    const response = await client
      .post('/api/instruments/ingest')
      .header('Authorization', `Bearer ${token}`)
      .json({
        batchId: 'pairing-1',
        samples: [
          {
            path: 'navigation.speedOverGround',
            recordedAt: DateTime.now().toISO(),
            value: 2.5,
          },
        ],
      })

    response.assertStatus(200)
  })

  test('deux interrogations simultanées ne livrent qu’un jeton', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin)
    const { created } = await createPairing(client)
    await attach(client, boat.id, created.userCode, admin)

    const responses = await Promise.all(
      Array.from({ length: 4 }, () => poll(client, created.deviceCode))
    )

    const statuses = responses.map((response) => response.body().status as string)
    assert.equal(statuses.filter((status) => status === 'approved').length, 1)
    assert.equal(statuses.filter((status) => status === 'expired').length, 3)
  })

  test('limite le débit d’interrogation par IP', async ({ client }) => {
    const { created } = await createPairing(client)
    for (let index = 0; index < 120; index++) {
      await client
        .post(INSTRUMENT_PAIRING_POLL_PATH)
        .header('X-Forwarded-For', '198.18.0.70')
        .json({
          deviceCode: created.deviceCode,
        })
    }

    const refused = await client
      .post(INSTRUMENT_PAIRING_POLL_PATH)
      .header('X-Forwarded-For', '198.18.0.70')
      .json({ deviceCode: created.deviceCode })

    refused.assertStatus(429)
  })

  test('source supprimée entre le rattachement et la livraison : expired, rien n’est consommé à tort', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    const { created } = await createPairing(client)
    await attach(client, boat.id, created.userCode, admin)
    await source!.delete()

    const response = await poll(client, created.deviceCode)

    assert.deepEqual(response.body(), { status: 'expired' })
  })
})

test.group('Instruments — appairage : rattachement (#1032)', (group) => {
  group.each.setup(() => truncateDb())

  test('un admin Pro rattache le boîtier : bateau, auteur, flash, audit', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    const { created } = await createPairing(client, { deviceLabel: 'fleetai-3f2a' })

    const response = await attach(client, boat.id, created.userCode, admin)

    response.assertStatus(302)
    assert.include(String(response.flashMessages().success), 'fleetai-3f2a')
    const [row] = await pairingRows()
    assert.equal(row.boatId, boat.id)
    assert.equal(row.organizationId, admin.organizationId)
    assert.equal(row.claimedByUserId, admin.id)
    assert.isNotNull(row.approvedAt)
    assert.isNull(row.consumedAt)
    // Aucun jeton à ce stade : il naît à la livraison.
    assert.isNull(await ingestHashOf(source!.id))
    const audit = await AuditLog.query().where('action', 'boat.instrument_pairing_attach').first()
    assert.equal(audit?.entityId, boat.id)
    assert.equal(audit?.userId, admin.id)
  })

  test('crée la source du bateau si besoin, à l’adresse par défaut du plugin', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)
    const { created } = await createPairing(client)

    await attach(client, boat.id, created.userCode, admin)

    const source = await BoatInstrumentSource.findByOrFail('boatId', boat.id)
    assert.equal(source.baseUrl, INSTRUMENT_SETUP_PLUGIN_PLACEHOLDER_URL)
    assert.isTrue(source.enabled)
    const delivered = await poll(client, created.deviceCode)
    assert.equal(delivered.body().status, 'approved')
  })

  test('accepte le code en minuscules, sans tiret, avec des espaces', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin)
    const { created } = await createPairing(client)

    const response = await attach(
      client,
      boat.id,
      ` ${created.userCode.replace('-', ' ').toLowerCase()} `,
      admin
    )

    assert.isUndefined(response.flashMessages().error)
    const pairing = await firstPairing()
    assert.isNotNull(pairing.approvedAt)
  })

  test('repousse l’expiration pour laisser au boîtier le temps de venir chercher son jeton', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin)
    const { created } = await createPairing(client)
    await InstrumentPairing.query().update({ expiresAt: DateTime.now().plus({ seconds: 10 }) })

    await attach(client, boat.id, created.userCode, admin)

    const [row] = await pairingRows()
    assert.approximately(
      row.expiresAt.diffNow('seconds').seconds,
      INSTRUMENT_PAIRING_DELIVERY_GRACE_SECONDS,
      5
    )
  })

  test('refuse un code déjà utilisé et ne touche pas au premier rattachement', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const first = await boatWithSource(admin)
    const second = await boatWithSource(admin)
    const { created } = await createPairing(client)
    await attach(client, first.boat.id, created.userCode, admin)

    const response = await attach(client, second.boat.id, created.userCode, admin)

    assert.exists(response.flashMessages().error)
    const unknown = await attach(client, first.boat.id, 'ZZZZ-ZZZZ', admin)
    assert.notEqual(response.flashMessages().error, unknown.flashMessages().error)
    const pairing = await firstPairing()
    assert.equal(pairing.boatId, first.boat.id)
  })

  test('code inconnu et code expiré : exactement la même erreur', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin)
    const { created } = await createPairing(client)
    await InstrumentPairing.query().update({ expiresAt: DateTime.now().minus({ minutes: 1 }) })

    const expired = await attach(client, boat.id, created.userCode, admin)
    const unknown = await attach(client, boat.id, 'ZZZZ-ZZZZ', admin)
    const malformed = await attach(client, boat.id, 'abc', admin)

    assert.exists(expired.flashMessages().error)
    assert.equal(expired.flashMessages().error, unknown.flashMessages().error)
    assert.equal(expired.flashMessages().error, malformed.flashMessages().error)
    const pairing = await firstPairing()
    assert.isNull(pairing.approvedAt)
  })

  test('refuse un membre sans `instruments.manage`', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const { boat } = await boatWithSource(admin)
    const { created } = await createPairing(client)

    await attach(client, boat.id, created.userCode, member)

    const pairing = await firstPairing()
    assert.isNull(pairing.approvedAt)
  })

  test('refuse le plan Starter', async ({ client, assert }) => {
    const admin = await createStarterAdminUser()
    const { boat } = await boatWithSource(admin, false)
    const { created } = await createPairing(client)

    await attach(client, boat.id, created.userCode, admin)

    const pairing = await firstPairing()
    assert.isNull(pairing.approvedAt)
    assert.isNull(await BoatInstrumentSource.findBy('boatId', boat.id))
  })

  test('le bateau d’une autre organisation est introuvable', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const other = await createAdminUser()
    const { boat } = await boatWithSource(other)
    const { created } = await createPairing(client)

    await attach(client, boat.id, created.userCode, admin)

    const pairing = await firstPairing()
    assert.isNull(pairing.approvedAt)
  })

  test('limite les essais ratés par utilisateur : le bon code n’est plus vérifié', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin)
    const { created } = await createPairing(client)
    for (let index = 0; index < INSTRUMENT_PAIRING_ATTEMPT_LIMIT.requests; index++) {
      await attach(client, boat.id, 'ZZZZ-ZZZZ', admin)
    }

    const blocked = await attach(client, boat.id, created.userCode, admin)

    assert.include(String(blocked.flashMessages().error), 'min')
    const pairing = await firstPairing()
    assert.isNull(pairing.approvedAt)

    const otherAdmin = await createAdminUser()
    const other = await boatWithSource(otherAdmin)
    const free = await attach(client, other.boat.id, created.userCode, otherAdmin)
    assert.isUndefined(free.flashMessages().error)
  })

  test('un rattachement réussi remet le compteur d’essais à zéro', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin)
    for (let index = 0; index < INSTRUMENT_PAIRING_ATTEMPT_LIMIT.requests - 1; index++) {
      await attach(client, boat.id, 'ZZZZ-ZZZZ', admin)
    }
    const { created } = await createPairing(client)
    await attach(client, boat.id, created.userCode, admin)

    const next = await createPairing(client)
    const response = await attach(client, boat.id, next.created.userCode, admin)

    assert.isUndefined(response.flashMessages().error)
  })

  test('rattacher à un bateau qui a déjà un jeton le remplace à la livraison', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    await client
      .post(`/boats/${boat.id}/instrument-source/ingest-token`)
      .loginAs(admin)
      .redirects(0)
    const before = await ingestHashOf(source!.id)
    const { created } = await createPairing(client)
    await attach(client, boat.id, created.userCode, admin)
    assert.equal(await ingestHashOf(source!.id), before)

    await poll(client, created.deviceCode)

    assert.notEqual(await ingestHashOf(source!.id), before)
  })
})

test.group('Instruments — appairage : purge (#1032)', (group) => {
  group.each.setup(() => truncateDb())

  test('supprime les appairages expirés, garde les valides', async ({ assert }) => {
    const live = await InstrumentPairingFactory.create()
    await InstrumentPairingFactory.merge({
      expiresAt: DateTime.now().minus({ minutes: 1 }),
    }).createMany(3)
    await InstrumentPairingFactory.merge({
      expiresAt: DateTime.now().minus({ days: 3 }),
      consumedAt: DateTime.now().minus({ days: 3 }),
    }).create()

    const job = await app.container.make(PurgeInstrumentPairings)
    await job.execute()

    const rows = await pairingRows()
    assert.deepEqual(
      rows.map((row) => row.id),
      [live.id]
    )
  })

  test('est planifiée dans le scheduler', async ({ assert }) => {
    const { readFile } = await import('node:fs/promises')
    const scheduler = await readFile(app.startPath('scheduler.ts'), 'utf8')
    assert.include(scheduler, 'PurgeInstrumentPairings.schedule')
  })
})
