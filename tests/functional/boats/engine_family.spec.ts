import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import BoatEngine from '#models/boat_engine'
import { createAdminUser } from '#tests/functional/helpers'
import { equipmentBodyToEnginePayload, storeBoatEngineValidator } from '#validators/boat_equipment'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

/**
 * Famille de motorisation portée par le moteur (#574) : ce que `kind`, `fuel`
 * et `stroke_type` ne savent pas dire — la transmission.
 */
test.group('Famille de motorisation (#574)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST engine enregistre la famille saisie', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/engines`)
      .loginAs(user)
      .form({ kind: 'inboard', fuel: 'diesel', family: 'inboard_diesel_saildrive' })
      .redirects(0)

    response.assertStatus(302)
    const engine = await BoatEngine.query().where('boatId', boat.id).firstOrFail()
    assert.equal(engine.family, 'inboard_diesel_saildrive')
  })

  test('POST engine sans famille la déduit en best-effort', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client
      .post(`/boats/${boat.id}/engines`)
      .loginAs(user)
      .form({ kind: 'inboard', fuel: 'diesel' })
      .redirects(0)

    const engine = await BoatEngine.query().where('boatId', boat.id).firstOrFail()
    // La variante saildrive n'étant pas devinable, la ligne d'arbre est
    // retenue : mêmes règles que le backfill de la migration.
    assert.equal(engine.family, 'inboard_diesel_shaft')
  })

  test('PUT engine corrige la famille sans toucher au reste', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({
      boatId: boat.id,
      kind: 'inboard',
      fuel: 'diesel',
      family: 'inboard_diesel_shaft',
      brand: 'Volvo Penta',
    }).create()

    await client
      .put(`/boats/${boat.id}/engines/${engine.id}`)
      .loginAs(user)
      .form({
        kind: 'inboard',
        fuel: 'diesel',
        family: 'inboard_diesel_saildrive',
        brand: 'Volvo Penta',
      })
      .redirects(0)

    await engine.refresh()
    assert.equal(engine.family, 'inboard_diesel_saildrive')
    assert.equal(engine.brand, 'Volvo Penta')
  })

  test('une famille inconnue est refusée par le validator', async ({ assert }) => {
    await assert.rejects(() =>
      storeBoatEngineValidator.validate({ kind: 'inboard', family: 'inboard_diesel_hovercraft' })
    )
  })

  test('« je ne sais pas » reste une réponse valide', async ({ assert }) => {
    for (const family of ['', '__none__']) {
      const body = await storeBoatEngineValidator.validate({ kind: 'other', family })
      assert.isNull(equipmentBodyToEnginePayload(body).family, `échec sur « ${family} »`)
    }
  })

  test('GET engine edit expose la famille au formulaire', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({
      boatId: boat.id,
      kind: 'outboard',
      family: 'outboard_2t',
    }).create()

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/edit`)
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as { engine: { family: string | null } }
    assert.equal(props.engine.family, 'outboard_2t')
  })
})
