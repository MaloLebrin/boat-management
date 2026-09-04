import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { createAdminUser } from '#tests/functional/helpers'

test.group('Engine update redirect (functional)', (group) => {
  group.each.setup(() => truncateDb())

  async function setup() {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id, kind: 'inboard' }).create()
    return { user, boat, engine }
  }

  test('PUT engine redirects to the engine sheet, not the boat page', async ({ client }) => {
    const { user, boat, engine } = await setup()

    const response = await client
      .put(`/boats/${boat.id}/engines/${engine.id}`)
      .loginAs(user)
      .form({ kind: 'inboard', model: 'D2-60' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}/engines/${engine.id}`)
    response.assertFlashMessage('success', 'Engine updated.')
  })

  test('PUT an unknown engine falls back to the boat page', async ({ client }) => {
    const { user, boat, engine } = await setup()

    const response = await client
      .put(`/boats/${boat.id}/engines/${engine.id + 9999}`)
      .loginAs(user)
      .form({ kind: 'inboard' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}`)
  })

  test('POST engine still redirects to the boat page', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/engines`)
      .loginAs(user)
      .form({ kind: 'inboard' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}`)
  })
})
