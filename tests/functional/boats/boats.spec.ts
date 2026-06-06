import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Boat from '#models/boat'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser } from '#tests/functional/helpers'

test.group('Boats (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /boats returns 200 for authenticated user', async ({ client }) => {
    const user = await UserFactory.with('organization').create()

    const response = await client.get('/boats').loginAs(user)

    response.assertStatus(200)
  })

  test('GET /boats redirects to /login when unauthenticated', async ({ client }) => {
    const response = await client.get('/boats').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('POST /boats creates a boat and redirects to its page', async ({ client, assert }) => {
    const user = await createAdminUser()

    const response = await client.post('/boats').loginAs(user).form({
      name: 'Hermione',
      propulsionType: 'motorboat',
    })

    const boat = await Boat.findBy('name', 'Hermione')
    assert.isNotNull(boat)
    assert.equal(boat!.organizationId, user.organizationId)
    response.assertRedirectsTo(`/boats/${boat!.id}`)
  })

  test('POST /boats does not create boat when name is missing', async ({ client, assert }) => {
    const user = await createAdminUser()

    const response = await client.post('/boats').loginAs(user).form({
      propulsionType: 'motorboat',
    })

    // Inertia validation: redirect back (not to /boats/:id)
    const redirectedToNewBoat = response.redirects().some((url) => /\/boats\/\d+$/.test(url))
    assert.isFalse(redirectedToNewBoat)
  })

  test('DELETE /boats/:id deletes the boat and redirects to /boats', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.delete(`/boats/${boat.id}`).loginAs(user)

    response.assertRedirectsTo('/boats')

    const found = await Boat.find(boat.id)
    assert.isNull(found)
  })

  test('DELETE /boats/:id from another org returns error (boat not visible)', async ({
    client,
    assert,
  }) => {
    const ownerUser = await createAdminUser()
    const otherUser = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: ownerUser.organizationId! }).create()

    await client.delete(`/boats/${boat.id}`).loginAs(otherUser)

    // Boat should still exist since the other user cannot see/delete it
    const found = await Boat.find(boat.id)
    assert.isNotNull(found)
  })
})
