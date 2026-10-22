import { test } from '@japa/runner'
import BoatInstrumentSource from '#models/boat_instrument_source'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser, createMemberUser } from '#tests/functional/helpers'
import { asInstrumentsReload, boatWithSource } from '#tests/functional/instruments/helpers'
import { INSTRUMENT_INGEST_TOKEN_PREFIX } from '#shared/constants/instruments'
import type { InstrumentsTabProps } from '#shared/types/instruments'

/** Gestion du jeton du plugin (#994) : admin seulement, jeton montré une fois, hash stocké. */

test.group('Instruments — jeton d’ingestion du plugin (#994)', (group) => {
  group.each.setup(() => truncateDb())

  test('génère un jeton, le flashe une fois et ne stocke que son hash', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)

    const response = await client
      .post(`/boats/${boat.id}/instrument-source/ingest-token`)
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)
    const token = String(response.flashMessage('instrumentIngestToken'))
    assert.isTrue(token.startsWith(INSTRUMENT_INGEST_TOKEN_PREFIX))
    assert.isAbove(token.length, 40)

    const stored = await BoatInstrumentSource.findOrFail(source!.id)
    assert.match(stored.ingestTokenHash!, /^[0-9a-f]{64}$/)
    assert.notInclude(JSON.stringify(stored.toJSON()), stored.ingestTokenHash!)
    assert.isNotNull(stored.ingestTokenIssuedAt)
  })

  test('régénérer remplace le jeton précédent', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    const url = `/boats/${boat.id}/instrument-source/ingest-token`

    await client.post(url).loginAs(admin).redirects(0)
    const before = await BoatInstrumentSource.findOrFail(source!.id)
    await client.post(url).loginAs(admin).redirects(0)
    const after = await BoatInstrumentSource.findOrFail(source!.id)

    assert.isNotNull(after.ingestTokenHash)
    assert.notEqual(before.ingestTokenHash, after.ingestTokenHash)
  })

  test('révoque le jeton ; sans jeton, le dit', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat, source } = await boatWithSource(admin)
    const url = `/boats/${boat.id}/instrument-source/ingest-token`

    const none = await client
      .delete(url)
      .loginAs(admin)
      .header('referer', `/boats/${boat.id}`)
      .redirects(0)
    assert.exists(none.flashMessages().error)

    await client.post(url).loginAs(admin).redirects(0)
    await client.delete(url).loginAs(admin).redirects(0)

    const stored = await BoatInstrumentSource.findOrFail(source!.id)
    assert.isNull(stored.ingestTokenHash)
    assert.isNull(stored.ingestTokenIssuedAt)
  })

  test('sans source, rien n’est généré', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)

    const response = await client
      .post(`/boats/${boat.id}/instrument-source/ingest-token`)
      .loginAs(admin)
      .header('referer', `/boats/${boat.id}`)
      .redirects(0)

    assert.exists(response.flashMessages().error)
    assert.isUndefined(response.flashMessages().instrumentIngestToken)
  })

  test('un member est refusé et aucun jeton n’est écrit', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const { boat, source } = await boatWithSource(admin)

    await client
      .post(`/boats/${boat.id}/instrument-source/ingest-token`)
      .loginAs(member)
      .redirects(0)

    const untouched = await BoatInstrumentSource.findOrFail(source!.id)
    assert.isNull(untouched.ingestTokenHash)
  })

  test('le bateau d’une autre organisation est introuvable', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const other = await createAdminUser()
    const { boat, source } = await boatWithSource(other)

    await client
      .post(`/boats/${boat.id}/instrument-source/ingest-token`)
      .loginAs(admin)
      .redirects(0)

    const untouched = await BoatInstrumentSource.findOrFail(source!.id)
    assert.isNull(untouched.ingestTokenHash)
  })

  test('la prop `instruments` dit qu’un jeton existe, sans jamais l’exposer', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin)
    await client
      .post(`/boats/${boat.id}/instrument-source/ingest-token`)
      .loginAs(admin)
      .redirects(0)

    const response = await asInstrumentsReload(client.get(`/boats/${boat.id}`).loginAs(admin))
    const props = response.inertiaProps as { instruments: InstrumentsTabProps }

    assert.isTrue(props.instruments.source!.hasIngestToken)
    assert.isNotNull(props.instruments.source!.ingestTokenIssuedAt)
    assert.notInclude(JSON.stringify(props), 'ingestTokenHash')
    assert.notInclude(JSON.stringify(props), INSTRUMENT_INGEST_TOKEN_PREFIX)
  })
})
