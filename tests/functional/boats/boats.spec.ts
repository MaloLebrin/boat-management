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

  test('POST /boats with a duplicate registration number flashes an error instead of 500', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    await BoatFactory.merge({
      organizationId: user.organizationId!,
      registrationNumber: 'FR-DUP-001',
    }).create()

    const response = await client
      .post('/boats')
      .loginAs(user)
      .form({ name: 'Duplicate', propulsionType: 'motorboat', registrationNumber: 'FR-DUP-001' })
      .redirects(0)

    // Redirected back with a friendly error, not a raw 500.
    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'A boat with this registration number already exists in your organisation.'
    )

    // No second boat with that registration number was created.
    const boats = await Boat.query()
      .where('organizationId', user.organizationId!)
      .where('registrationNumber', 'FR-DUP-001')
    assert.lengthOf(boats, 1)
  })

  test('PUT /boats/:id with a duplicate registration number flashes an error instead of 500', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    await BoatFactory.merge({
      organizationId: user.organizationId!,
      registrationNumber: 'FR-TAKEN-001',
    }).create()
    const target = await BoatFactory.merge({
      organizationId: user.organizationId!,
      registrationNumber: 'FR-FREE-002',
    }).create()

    const response = await client
      .put(`/boats/${target.id}`)
      .loginAs(user)
      .form({ name: target.name, registrationNumber: 'FR-TAKEN-001' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage(
      'error',
      'A boat with this registration number already exists in your organisation.'
    )

    // The target boat keeps its own registration number (update rolled back).
    await target.refresh()
    assert.equal(target.registrationNumber, 'FR-FREE-002')
  })

  test('POST /boats allows duplicate null registration numbers', async ({ client, assert }) => {
    const user = await createAdminUser()
    await BoatFactory.merge({
      organizationId: user.organizationId!,
      registrationNumber: null,
    }).create()

    const response = await client
      .post('/boats')
      .loginAs(user)
      .form({ name: 'No Registration', propulsionType: 'motorboat' })

    const boat = await Boat.findBy('name', 'No Registration')
    assert.isNotNull(boat)
    response.assertRedirectsTo(`/boats/${boat!.id}`)
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

  test('GET /boats/:id renders the merged fiche (maintenance + navigation data) (#365)', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/boats/${boat.id}`).loginAs(user)

    response.assertStatus(200)
    // Le rendu doit inclure les données ex-page /navigation désormais fusionnées
    // dans la même requête (#365) : si le contrôleur ne les avait pas chargées,
    // le composant boats/show planterait au montage (props requises).
    const html = response.text()
    assert.include(html, 'navigationLogs')
    assert.include(html, 'portOptions')
  })

  test('GET /boats/:id/navigation redirects to the merged fiche (#365)', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/boats/${boat.id}/navigation`).loginAs(user).redirects(0)

    response.assertStatus(302)
    assert.equal(response.header('location'), `/boats/${boat.id}?tab=navigation-logs`)
  })
})
