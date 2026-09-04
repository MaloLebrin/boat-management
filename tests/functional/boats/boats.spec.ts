import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import Boat from '#models/boat'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { PortFactory } from '#database/factories/port_factory'
import { createAdminUser, createMemberUser } from '#tests/functional/helpers'

test.group('Boats (functional)', (group) => {
  group.each.setup(() => truncateDb())

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

  test('DELETE /boats/:id is denied to a plain member (boats.delete is admin-only)', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()

    // Bouncer redirects form-submission methods (POST/PUT/PATCH/DELETE) back with
    // a flash error instead of a raw 403, to stay Inertia-friendly — cf. CLAUDE.md.
    const response = await client.delete(`/boats/${boat.id}`).loginAs(member).redirects(0)

    response.assertStatus(302)
    const found = await Boat.find(boat.id)
    assert.isNotNull(found)
  })

  test("GET /boats/:id ne charge plus les données d'onglet dans la visite initiale (#463)", async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/boats/${boat.id}`).loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as Record<string, unknown>

    // Le squelette (identité, photos, position, droits) est bien là…
    assert.property(props, 'boat')
    assert.property(props, 'canManageMaintenance')
    assert.property(props, 'positionHistory')

    // …mais les jeux de données d'onglet sont différés : la page peut peindre
    // immédiatement au lieu d'attendre une vingtaine de requêtes (#463).
    assert.notProperty(props, 'maintenanceEvents')
    assert.notProperty(props, 'navigationLogs')
    assert.notProperty(props, 'portOptions')
  })

  test('GET /boats/:id annonce les deux groupes de props différées (#463)', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/boats/${boat.id}`).loginAs(user).withInertia()

    response.assertStatus(200)
    const deferred = response.body().deferredProps as Record<string, string[]>

    // Deux groupes = deux requêtes parallèles après le rendu, une par famille
    // d'onglets, plutôt qu'un seul aller-retour monolithique.
    assert.includeMembers(deferred.maintenance!, [
      'maintenanceEvents',
      'maintenanceTasks',
      'maintenanceSheets',
      'boatDocuments',
      'equipmentActions',
      'aiSuggestions',
    ])
    assert.includeMembers(deferred.navigation!, [
      'navigationLogs',
      'fuelLogs',
      'incidents',
      'portOptions',
      'crewMemberOptions',
    ])
  })

  test('la visite partielle du groupe navigation renvoie bien ses données (#463)', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .get(`/boats/${boat.id}`)
      .loginAs(user)
      .withInertiaPartialReload('boats/show', ['navigationLogs', 'portOptions'])

    response.assertStatus(200)
    const props = response.inertiaProps as {
      navigationLogs: unknown[]
      portOptions: { id: number; name: string }[]
    }

    assert.isArray(props.navigationLogs)
    assert.sameMembers(
      props.portOptions.map((p) => p.id),
      [port.id]
    )
  })

  test('GET /boats/:id renvoie 200 pour un bateau aux champs optionnels null (#478)', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    // Mêmes trous que les bateaux seedés de la sandbox démo : ni catégorie, ni
    // immatriculation, ni dimensions.
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      registrationNumber: null,
      type: null,
      category: null,
      lengthM: null,
      beamM: null,
    }).create()

    const response = await client.get(`/boats/${boat.id}`).loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as { boat: { category: string | null } }
    assert.isNull(props.boat.category)
  })

  test('la visite partielle du groupe maintenance renvoie 200 sans suggestion IA (#478)', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      registrationNumber: null,
      type: null,
    }).create()

    // Aucune AiAnalysis en base : le prop différé `aiSuggestions` ne doit pas
    // faire jeter « Cannot serialize an item with null value » au serializer
    // Inertia (un callback différé n'a pas le droit de résoudre `null`).
    const response = await client
      .get(`/boats/${boat.id}`)
      .loginAs(user)
      .withInertiaPartialReload('boats/show', [
        'maintenanceEvents',
        'maintenanceTasks',
        'maintenanceSheets',
        'boatDocuments',
        'equipmentActions',
        'aiSuggestions',
      ])

    response.assertStatus(200)
    const props = response.inertiaProps as { aiSuggestions: unknown }
    assert.deepEqual(props.aiSuggestions, [])
  })

  test("GET /boats/:id?tab=… expose l'onglet demandé au rendu serveur (#463)", async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    // Sans le paramètre, le SSR rendait Aperçu puis basculait à l'hydratation :
    // c'est ce flash d'onglet que `initialTab` supprime.
    const withTab = await client.get(`/boats/${boat.id}?tab=history`).loginAs(user).withInertia()
    withTab.assertStatus(200)
    assert.equal((withTab.inertiaProps as { initialTab: string | null }).initialTab, 'history')

    const withoutTab = await client.get(`/boats/${boat.id}`).loginAs(user).withInertia()
    withoutTab.assertStatus(200)
    assert.isNull((withoutTab.inertiaProps as { initialTab: string | null }).initialTab)
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
