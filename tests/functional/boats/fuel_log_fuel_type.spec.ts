import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatFuelLogFactory } from '#database/factories/boat_fuel_log_factory'
import { createAdminUser } from '#tests/functional/helpers'
import BoatFuelLog from '#models/boat_fuel_log'

/** Carburant du plein (#585). */
test.group('Fuel log fuel type (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('POST enregistre le carburant fourni', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client
      .post(`/boats/${boat.id}/fuel-logs`)
      .loginAs(user)
      .form({ fueledAt: '2026-06-01', quantityLiters: 50, fuelType: 'essence' })

    const log = await BoatFuelLog.query().where('boatId', boat.id).firstOrFail()
    assert.equal(log.fuelType, 'essence')
  })

  test('POST sans carburant ni moteur laisse le champ nul', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client
      .post(`/boats/${boat.id}/fuel-logs`)
      .loginAs(user)
      .form({ fueledAt: '2026-06-01', quantityLiters: 50 })

    const log = await BoatFuelLog.query().where('boatId', boat.id).firstOrFail()
    assert.isNull(log.fuelType)
  })

  test('POST pré-remplit le carburant depuis le moteur lié', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, fuel: 'diesel' }).create()

    await client
      .post(`/boats/${boat.id}/fuel-logs`)
      .loginAs(user)
      .form({ fueledAt: '2026-06-01', quantityLiters: 50, boatEngineId: engine.id })

    const log = await BoatFuelLog.query().where('boatId', boat.id).firstOrFail()
    assert.equal(log.fuelType, 'diesel')
  })

  test('un carburant explicite prime sur celui du moteur', async ({ client, assert }) => {
    // Cas réel de la bi-motorisation : le plein d'essence de l'annexe est saisi
    // alors que le moteur in-bord diesel reste sélectionné.
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, fuel: 'diesel' }).create()

    await client.post(`/boats/${boat.id}/fuel-logs`).loginAs(user).form({
      fueledAt: '2026-06-01',
      quantityLiters: 12,
      boatEngineId: engine.id,
      fuelType: 'essence',
    })

    const log = await BoatFuelLog.query().where('boatId', boat.id).firstOrFail()
    assert.equal(log.fuelType, 'essence')
  })

  test('POST refuse un carburant hors vocabulaire', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client
      .post(`/boats/${boat.id}/fuel-logs`)
      .loginAs(user)
      .form({ fueledAt: '2026-06-01', quantityLiters: 50, fuelType: 'kerosene' })

    assert.isNull(await BoatFuelLog.query().where('boatId', boat.id).first())
  })

  test("l'export CSV gagne une colonne carburant, vide pour l'historique", async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await BoatFuelLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      fuelType: 'diesel',
    }).create()
    await BoatFuelLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      fuelType: null,
    }).create()

    const response = await client
      .get(`/boats/${boat.id}/export/fuel-logs.csv`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(200)

    const csv = response.text()
    const [header, ...rows] = csv
      .replace(/^\uFEFF/, '')
      .trim()
      .split('\r\n')
    const fuelColumn = header.split(';').indexOf('carburant')

    assert.isAbove(fuelColumn, -1)
    assert.sameMembers(
      rows.map((row) => row.split(';')[fuelColumn]),
      ['diesel', '']
    )
  })
})
