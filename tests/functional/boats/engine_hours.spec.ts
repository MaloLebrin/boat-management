import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import BoatEngine from '#models/boat_engine'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { createAdminUser } from '#tests/functional/helpers'

test.group('Engine hours mirror installHours at creation (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST engine sets hours to the same value as installHours', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/engines`)
      .loginAs(user)
      .form({ kind: 'inboard', installHours: '75' })
      .redirects(0)

    response.assertStatus(302)

    const engine = await BoatEngine.query().where('boatId', boat.id).firstOrFail()
    assert.equal(engine.installHours, 75)
    assert.equal(engine.hours, 75)
  })

  test('POST engine without installHours leaves both hours and installHours null', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/engines`)
      .loginAs(user)
      .form({ kind: 'inboard' })
      .redirects(0)

    response.assertStatus(302)

    const engine = await BoatEngine.query().where('boatId', boat.id).firstOrFail()
    assert.isNull(engine.installHours)
    assert.isNull(engine.hours)
  })

  test('PUT engine ignores an hours field and leaves the running total untouched', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({
      boatId: boat.id,
      kind: 'inboard',
      hours: 100,
      installHours: 100,
    }).create()

    const response = await client
      .put(`/boats/${boat.id}/engines/${engine.id}`)
      .loginAs(user)
      .form({ kind: 'inboard', hours: '9999', installHours: '9999' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Engine updated.')

    await engine.refresh()
    assert.equal(engine.hours, 100)
    assert.equal(engine.installHours, 100)
  })
})

test.group('Engine hours increment (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function setupEngine(hours: number | null) {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({
      boatId: boat.id,
      kind: 'inboard',
      hours,
    }).create()
    return { user, boat, engine }
  }

  test('PATCH hours adds the increment to the current value', async ({ client, assert }) => {
    const { user, boat, engine } = await setupEngine(100)

    const response = await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/hours`)
      .loginAs(user)
      .form({ hoursIncrement: 5 })
      .redirects(0)

    response.assertStatus(302)

    await engine.refresh()
    assert.equal(engine.hours, 105)
  })

  test('PATCH hours starts from zero when hours was unset (null)', async ({ client, assert }) => {
    const { user, boat, engine } = await setupEngine(null)

    const response = await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/hours`)
      .loginAs(user)
      .form({ hoursIncrement: 8 })
      .redirects(0)

    response.assertStatus(302)

    await engine.refresh()
    assert.equal(engine.hours, 8)
  })

  test('PATCH hours rejects a zero or negative increment', async ({ client, assert }) => {
    const { user, boat, engine } = await setupEngine(100)

    const response = await client
      .patch(`/boats/${boat.id}/engines/${engine.id}/hours`)
      .loginAs(user)
      .form({ hoursIncrement: 0 })
      .redirects(0)

    response.assertStatus(302)

    await engine.refresh()
    assert.equal(engine.hours, 100)
  })

  test('PATCH hours flashes not found for an unknown engine id', async ({ client }) => {
    const { user, boat } = await setupEngine(100)

    const response = await client
      .patch(`/boats/${boat.id}/engines/999999/hours`)
      .loginAs(user)
      .form({ hoursIncrement: 5 })

    response.assertRedirectsTo(`/boats/${boat.id}`)
  })
})
