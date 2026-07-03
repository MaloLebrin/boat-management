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
