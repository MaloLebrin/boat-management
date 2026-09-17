import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import Boat from '#models/boat'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser } from '#tests/functional/helpers'

/**
 * Bateau d'une autre organisation : les cinq routes de la ressource bateau
 * doivent le traiter comme inexistant. Caractérisation avant de confier leur
 * résolution à `BoatContextService`.
 */
test.group('Boats — bateau invisible (functional)', (group) => {
  group.each.setup(() => truncateDb())

  async function foreignBoat() {
    const owner = await createAdminUser()
    const intruder = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()
    return { intruder, boat }
  }

  test('GET /boats/:id redirige vers la liste', async ({ client }) => {
    const { intruder, boat } = await foreignBoat()

    const response = await client.get(`/boats/${boat.id}`).loginAs(intruder).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
  })

  test('GET /boats/:id/edit redirige vers la liste', async ({ client }) => {
    const { intruder, boat } = await foreignBoat()

    const response = await client.get(`/boats/${boat.id}/edit`).loginAs(intruder).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
  })

  test('DELETE /boats/:id redirige vers la liste sans rien supprimer', async ({
    client,
    assert,
  }) => {
    const { intruder, boat } = await foreignBoat()

    const response = await client.delete(`/boats/${boat.id}`).loginAs(intruder).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
    assert.isNotNull(await Boat.find(boat.id))
  })

  test('PATCH /boats/:id/assignment redirige vers la liste', async ({ client }) => {
    const { intruder, boat } = await foreignBoat()

    const response = await client
      .patch(`/boats/${boat.id}/assignment`)
      .json({ spotId: null })
      .loginAs(intruder)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
  })

  // Corrigé en passant par `BoatContextService` : `update` résolvait son bateau
  // hors du `try`, l'erreur partait donc au handler global et la route
  // répondait 500 là où les quatre autres redirigeaient.
  test('PUT /boats/:id redirige vers la liste', async ({ client, assert }) => {
    const { intruder, boat } = await foreignBoat()
    const nameBefore = boat.name

    const response = await client
      .put(`/boats/${boat.id}`)
      .json({ name: 'Renommé par un intrus' })
      .loginAs(intruder)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
    await boat.refresh()
    assert.equal(boat.name, nameBefore)
  })

  test('un utilisateur sans organisation ne voit aucun bateau', async ({ client }) => {
    const owner = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()
    const orphan = await UserFactory.create()

    const response = await client.get(`/boats/${boat.id}`).loginAs(orphan).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
  })
})
