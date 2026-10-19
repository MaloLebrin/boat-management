import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { truncateDb } from '#tests/utils/db'
import BoatInstrumentSource from '#models/boat_instrument_source'
import AuditLog from '#models/audit_log'
import DataEncryptionService from '#services/data_encryption_service'
import {
  createAdminUser,
  createMemberUser,
  createStarterAdminUser,
} from '#tests/functional/helpers'
import { asInstrumentsReload, boatWithSource } from '#tests/functional/instruments/helpers'
import type { InstrumentsTabProps } from '#shared/types/instruments'

/**
 * Source Signal K d'un bateau (#988) : gating de plan, rôles, chiffrement du
 * jeton au repos et sa diffusion limitée à la prop différée `instruments`.
 */

const TOKEN = 'sk-readonly-token-123'

test.group('Instruments — PUT/DELETE instrument-source', (group) => {
  group.each.setup(() => truncateDb())

  test('un admin Pro enregistre la source, jeton chiffré au repos', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)

    const response = await client
      .put(`/boats/${boat.id}/instrument-source`)
      .loginAs(admin)
      .header('referer', `/boats/${boat.id}`)
      .json({ baseUrl: 'https://signalk.example:3443/', token: TOKEN })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Instruments source saved.')

    const source = await BoatInstrumentSource.query().where('boatId', boat.id).firstOrFail()
    assert.equal(source.baseUrl, 'https://signalk.example:3443')
    assert.equal(source.vesselContext, 'vessels.self')
    assert.isTrue(source.enabled)
    assert.isNotNull(source.tokenEncrypted)
    assert.notInclude(source.tokenEncrypted!, TOKEN)
    const encryption = await app.container.make(DataEncryptionService)
    assert.equal(encryption.decrypt(source.tokenEncrypted!)?.plainText, TOKEN)
    assert.equal(
      await AuditLog.query()
        .where('action', 'boat.instrument_source_update')
        .count('* as n')
        .then((r) => Number(r[0].$extras.n)),
      1
    )
  })

  test('token absent conserve, null efface', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)
    const url = `/boats/${boat.id}/instrument-source`

    await client
      .put(url)
      .loginAs(admin)
      .json({ baseUrl: 'https://sk.example', token: TOKEN })
      .redirects(0)
    await client
      .put(url)
      .loginAs(admin)
      .json({ baseUrl: 'https://sk.example', enabled: false })
      .redirects(0)
    let source = await BoatInstrumentSource.query().where('boatId', boat.id).firstOrFail()
    assert.isNotNull(source.tokenEncrypted)
    assert.isFalse(source.enabled)

    await client
      .put(url)
      .loginAs(admin)
      .json({ baseUrl: 'https://sk.example', token: null })
      .redirects(0)
    source = await BoatInstrumentSource.query().where('boatId', boat.id).firstOrFail()
    assert.isNull(source.tokenEncrypted)
    assert.equal(
      await BoatInstrumentSource.query()
        .where('boatId', boat.id)
        .count('* as n')
        .then((r) => Number(r[0].$extras.n)),
      1
    )
  })

  for (const baseUrl of [
    'https://sk.example/signalk',
    'https://u:p@sk.example',
    'ws://sk.example',
    'sk.example:3000',
    'https://sk.example; script-src *',
  ]) {
    test(`refuse l’adresse « ${baseUrl} »`, async ({ client, assert }) => {
      const admin = await createAdminUser()
      const { boat } = await boatWithSource(admin, false)

      const response = await client
        .put(`/boats/${boat.id}/instrument-source`)
        .loginAs(admin)
        .json({ baseUrl })
        .redirects(0)

      response.assertStatus(302)
      assert.include(String(response.flashMessage('error')), 'origin')
      assert.isNull(await BoatInstrumentSource.query().where('boatId', boat.id).first())
    })
  }

  test('un member est refusé et rien n’est écrit', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const { boat } = await boatWithSource(admin, false)

    const response = await client
      .put(`/boats/${boat.id}/instrument-source`)
      .loginAs(member)
      .json({ baseUrl: 'https://sk.example' })
      .redirects(0)

    response.assertStatus(302)
    assert.isNull(await BoatInstrumentSource.query().where('boatId', boat.id).first())
  })

  test('un admin Starter est renvoyé vers la facturation', async ({ client }) => {
    const admin = await createStarterAdminUser()
    const { boat } = await boatWithSource(admin, false)

    const response = await client
      .put(`/boats/${boat.id}/instrument-source`)
      .loginAs(admin)
      .json({ baseUrl: 'https://sk.example' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/settings/billing')
    response.assertFlashMessage(
      'error',
      "Connecting a boat's instruments (Signal K) is available on the Pro and Enterprise plans."
    )
  })

  test('le bateau d’une autre organisation est introuvable', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const other = await createAdminUser()
    const { boat } = await boatWithSource(other, false)

    const response = await client
      .put(`/boats/${boat.id}/instrument-source`)
      .loginAs(admin)
      .json({ baseUrl: 'https://sk.example' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
    assert.isNull(await BoatInstrumentSource.query().where('boatId', boat.id).first())
  })

  test('DELETE révoque la source et ses échantillons', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin)

    const response = await client
      .delete(`/boats/${boat.id}/instrument-source`)
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Instruments source removed.')
    assert.isNull(await BoatInstrumentSource.query().where('boatId', boat.id).first())

    const again = await client
      .delete(`/boats/${boat.id}/instrument-source`)
      .loginAs(admin)
      .redirects(0)
    again.assertFlashMessage('error', 'This boat has no instruments source.')
  })

  test('DELETE refusé à un member', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const { boat } = await boatWithSource(admin)

    const response = await client
      .delete(`/boats/${boat.id}/instrument-source`)
      .loginAs(member)
      .redirects(0)

    response.assertStatus(302)
    assert.isNotNull(await BoatInstrumentSource.query().where('boatId', boat.id).first())
  })
})

test.group('Instruments — prop différée de boats.show', (group) => {
  group.each.setup(() => truncateDb())

  async function seededSource(admin: Awaited<ReturnType<typeof createAdminUser>>) {
    const { boat, source } = await boatWithSource(admin)
    const encryption = await app.container.make(DataEncryptionService)
    source!.tokenEncrypted = encryption.encrypt(TOKEN)
    await source!.save()
    return boat
  }

  test('le jeton n’est jamais dans la réponse initiale', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await seededSource(admin)

    const response = await client.get(`/boats/${boat.id}`).loginAs(admin).withInertia()

    response.assertStatus(200)
    assert.notInclude(JSON.stringify(response.inertiaProps), TOKEN)
    assert.notInclude(response.text(), TOKEN)
  })

  test('un admin reçoit le jeton en rechargement partiel', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await seededSource(admin)

    const response = await asInstrumentsReload(client.get(`/boats/${boat.id}`).loginAs(admin))

    response.assertStatus(200)
    const props = response.inertiaProps as { instruments: InstrumentsTabProps }
    assert.equal(props.instruments.source?.token, TOKEN)
    assert.isTrue(props.instruments.source?.hasToken)
    assert.deepEqual(props.instruments.can, { manage: true, ingest: true })
  })

  test('un member qui peut éditer reçoit le jeton mais pas manage', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const boat = await seededSource(admin)

    const response = await asInstrumentsReload(client.get(`/boats/${boat.id}`).loginAs(member))

    const props = response.inertiaProps as { instruments: InstrumentsTabProps }
    assert.deepEqual(props.instruments.can, { manage: false, ingest: true })
    assert.equal(props.instruments.source?.token, TOKEN)
  })

  test('sans le flag de plan : coquille vide, jamais null', async ({ client, assert }) => {
    const admin = await createStarterAdminUser()
    const { boat } = await boatWithSource(admin)

    const response = await asInstrumentsReload(client.get(`/boats/${boat.id}`).loginAs(admin))

    response.assertStatus(200)
    const props = response.inertiaProps as { instruments: InstrumentsTabProps }
    assert.deepEqual(props.instruments, {
      source: null,
      latest: [],
      recent: {},
      can: { manage: true, ingest: true },
    })
  })

  test('sans source : coquille vide avec les droits', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)

    const response = await asInstrumentsReload(client.get(`/boats/${boat.id}`).loginAs(admin))

    const props = response.inertiaProps as { instruments: InstrumentsTabProps }
    assert.isNull(props.instruments.source)
    assert.deepEqual(props.instruments.latest, [])
  })
})
