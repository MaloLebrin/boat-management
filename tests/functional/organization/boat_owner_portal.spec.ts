import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser, createBoatOwnerUser } from '#tests/functional/helpers'
import { assertPageContract } from '#tests/support/inertia_page'

/**
 * Portail propriétaire (#691).
 *
 * `boat_owner` est le seul rôle du produit à n'avoir **aucune** capability
 * (`BOAT_OWNER_CAPABILITIES` est vide, par conception). Son accès repose donc
 * entièrement sur deux mécanismes, et aucun des deux n'était testé :
 *
 * 1. `boatOwnerPortalRedirect()` — sur chaque index staff, un `authorize()`
 *    refusé rendrait un 403 brut ; le guard redirige vers `/owner/boats` à la
 *    place. Retirer cet appel d'un contrôleur ne casserait rien de visible côté
 *    staff, et enfermerait le propriétaire devant une page d'erreur.
 * 2. Le scoping par le pivot `boat_owners` — c'est la seule chose qui empêche un
 *    propriétaire de voir la flotte entière de l'organisation.
 */

test.group('Boat owner portal (functional)', (group) => {
  group.each.setup(() => truncateDb())

  // --- 1. la redirection plutôt que le 403 ---

  test('a boat owner visiting /boats is redirected to their portal', async ({ client }) => {
    const admin = await createAdminUser()
    const owner = await createBoatOwnerUser(admin.organizationId!)

    const response = await client.get('/boats').loginAs(owner).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/owner/boats')
  })

  test('the same holds on the navigation indexes', async ({ client }) => {
    const admin = await createAdminUser()
    const owner = await createBoatOwnerUser(admin.organizationId!)

    for (const path of ['/navigation/logbook', '/navigation/fuel', '/navigation/incidents']) {
      const response = await client.get(path).loginAs(owner).redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', '/owner/boats')
    }
  })

  test('a staff member is not redirected — the guard is role-scoped', async ({ client }) => {
    // Le témoin : sans lui, une redirection posée sur tout le monde passerait
    // pour un succès.
    const admin = await createAdminUser()

    const response = await client.get('/boats').loginAs(admin).withInertia()

    response.assertStatus(200)
  })

  // --- 2. le scoping par le pivot ---

  test('the portal lists only the boats attached to the owner', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const owned = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const notOwned = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const owner = await createBoatOwnerUser(admin.organizationId!)
    await owned.related('owners').attach([owner.id])

    const response = await client.get('/owner/boats').loginAs(owner).withInertia()

    assertPageContract(assert, response, 'owner/boats/index')
    const ids = (response.inertiaProps as { boats: { id: number }[] }).boats.map((b) => b.id)
    assert.deepEqual(ids, [owned.id])
    assert.notInclude(ids, notOwned.id, 'un bateau non rattaché ne doit pas apparaître')
  })

  test('a boat of the same organization but not attached is out of reach', async ({ client }) => {
    const admin = await createAdminUser()
    const notOwned = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const owner = await createBoatOwnerUser(admin.organizationId!)

    const response = await client.get(`/owner/boats/${notOwned.id}`).loginAs(owner).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/owner/boats')
  })

  test('a boat of another organization is out of reach too', async ({ client }) => {
    // Deux gardes se superposent ici — le pivot et l'organisation. Le test
    // vérifie qu'au moins l'une tient, y compris si l'attachement existait par
    // erreur.
    const admin = await createAdminUser()
    const otherOrgAdmin = await createAdminUser()
    const foreignBoat = await BoatFactory.merge({
      organizationId: otherOrgAdmin.organizationId!,
    }).create()
    const owner = await createBoatOwnerUser(admin.organizationId!)

    const response = await client.get(`/owner/boats/${foreignBoat.id}`).loginAs(owner).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/owner/boats')
  })

  test('the detail page renders for a boat the owner actually owns', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const owner = await createBoatOwnerUser(admin.organizationId!)
    await boat.related('owners').attach([owner.id])

    const response = await client.get(`/owner/boats/${boat.id}`).loginAs(owner).withInertia()

    assertPageContract(assert, response, 'owner/boats/show')
    assert.equal((response.inertiaProps as { boat: { id: number } }).boat.id, boat.id)
  })
})
