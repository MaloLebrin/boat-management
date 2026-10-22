import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import BoatEngine from '#models/boat_engine'
import { createAdminUser } from '#tests/functional/helpers'
import { boatWithSource } from '#tests/functional/instruments/helpers'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'

/** Formulaire moteur (#991) : l'identifiant Signal K, unique par bateau. */

test.group('Instruments — instrumentKey du moteur', (group) => {
  group.each.setup(() => truncateDb())

  const body = (instrumentKey: string) => ({
    kind: 'inboard',
    status: 'operational',
    instrumentKey,
  })

  test('crée un moteur avec son identifiant, normalisé', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)

    const response = await client
      .post(`/boats/${boat.id}/engines`)
      .loginAs(admin)
      .form(body('  port '))
      .redirects(0)

    response.assertStatus(302)
    const engine = await BoatEngine.query().where('boatId', boat.id).firstOrFail()
    assert.equal(engine.instrumentKey, 'port')
  })

  test('un identifiant vide est enregistré à null', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)

    await client.post(`/boats/${boat.id}/engines`).loginAs(admin).form(body('')).redirects(0)

    const engine = await BoatEngine.query().where('boatId', boat.id).firstOrFail()
    assert.isNull(engine.instrumentKey)
  })

  test('refuse un identifiant déjà pris sur le bateau, à la création', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)
    await BoatEngineFactory.merge({ boatId: boat.id, instrumentKey: 'port' }).create()

    const response = await client
      .post(`/boats/${boat.id}/engines`)
      .loginAs(admin)
      .header('referer', `/boats/${boat.id}`)
      .form(body('port'))
      .redirects(0)

    response.assertStatus(302)
    assert.exists(response.flashMessages().error)
    const count = await BoatEngine.query().where('boatId', boat.id).count('* as n')
    assert.equal(Number(count[0].$extras.n), 1)
  })

  test('refuse un identifiant déjà pris à la modification, mais pas le sien', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)
    await BoatEngineFactory.merge({ boatId: boat.id, instrumentKey: 'port' }).create()
    const second = await BoatEngineFactory.merge({
      boatId: boat.id,
      instrumentKey: 'starboard',
      instrumentRunTimeS: 7_200,
    }).create()

    const taken = await client
      .put(`/boats/${boat.id}/engines/${second.id}`)
      .loginAs(admin)
      .header('referer', `/boats/${boat.id}`)
      .form(body('port'))
      .redirects(0)
    assert.exists(taken.flashMessages().error)
    const unchanged = await BoatEngine.findOrFail(second.id)
    assert.equal(unchanged.instrumentKey, 'starboard')

    // Même clé : la base de runTime est conservée.
    await client
      .put(`/boats/${boat.id}/engines/${second.id}`)
      .loginAs(admin)
      .form(body('starboard'))
      .redirects(0)
    const kept = await BoatEngine.findOrFail(second.id)
    assert.equal(kept.instrumentRunTimeS, 7_200)

    // Autre clé libre : la base est effacée (autre moteur du calculateur).
    await client
      .put(`/boats/${boat.id}/engines/${second.id}`)
      .loginAs(admin)
      .form(body('1'))
      .redirects(0)
    const moved = await BoatEngine.findOrFail(second.id)
    assert.equal(moved.instrumentKey, '1')
    assert.isNull(moved.instrumentRunTimeS)
  })

  test('refuse un identifiant qui n’est pas un segment de chemin', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { boat } = await boatWithSource(admin, false)

    await client
      .post(`/boats/${boat.id}/engines`)
      .loginAs(admin)
      .header('referer', `/boats/${boat.id}`)
      .form(body('port.main'))
      .redirects(0)

    const count = await BoatEngine.query().where('boatId', boat.id).count('* as n')
    assert.equal(Number(count[0].$extras.n), 0)
  })
})
