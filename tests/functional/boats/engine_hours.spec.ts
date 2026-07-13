import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { createAdminUser } from '#tests/functional/helpers'

test.group('Engine hours regression guard (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function setupEngine(hours: number) {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({
      boatId: boat.id,
      kind: 'inboard',
      hours,
    }).create()
    return { user, boat, engine }
  }

  test('PUT engine rejects a lower hours value and keeps the current one', async ({
    client,
    assert,
  }) => {
    const { user, boat, engine } = await setupEngine(100)

    const response = await client
      .put(`/boats/${boat.id}/engines/${engine.id}`)
      .loginAs(user)
      .form({ kind: 'inboard', hours: '50' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Engine hours cannot be lower than the current value.')

    await engine.refresh()
    assert.equal(engine.hours, 100)
  })

  test('PUT engine accepts a higher hours value', async ({ client, assert }) => {
    const { user, boat, engine } = await setupEngine(100)

    const response = await client
      .put(`/boats/${boat.id}/engines/${engine.id}`)
      .loginAs(user)
      .form({ kind: 'inboard', hours: '250' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Engine updated.')

    await engine.refresh()
    assert.equal(engine.hours, 250)
  })

  test('PUT engine accepts an equal hours value', async ({ client, assert }) => {
    const { user, boat, engine } = await setupEngine(100)

    const response = await client
      .put(`/boats/${boat.id}/engines/${engine.id}`)
      .loginAs(user)
      .form({ kind: 'inboard', hours: '100' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Engine updated.')

    await engine.refresh()
    assert.equal(engine.hours, 100)
  })

  test('PUT engine allows setting hours from an unset (null) value', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({
      boatId: boat.id,
      kind: 'inboard',
      hours: null,
    }).create()

    const response = await client
      .put(`/boats/${boat.id}/engines/${engine.id}`)
      .loginAs(user)
      .form({ kind: 'inboard', hours: '10' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Engine updated.')

    await engine.refresh()
    assert.equal(engine.hours, 10)
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
