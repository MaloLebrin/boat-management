import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import BoatPositionHistory from '#models/boat_position_history'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser, createBoatOwnerUser } from '#tests/functional/helpers'

/**
 * Tests de caractérisation de `BoatPositionController` (vague 0.4) : position
 * manuelle d'un bateau, historisée dans `boat_position_history`.
 */

const MARSEILLE = { latitude: 43.2965, longitude: 5.3698 }

test.group('Position manuelle — POST /boats/:boatId/position (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('redirige vers /login sans authentification', async ({ client }) => {
    const response = await client.post('/boats/1/position').form(MARSEILLE).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('un admin enregistre une position manuelle ouverte et revient en arrière', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/position`)
      .loginAs(admin)
      .header('referer', `/boats/${boat.id}?tab=position`)
      .form(MARSEILLE)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}?tab=position`)

    const position = await BoatPositionHistory.query().where('boatId', boat.id).firstOrFail()
    assert.equal(position.source, 'manual')
    assert.isNull(position.spotId)
    assert.isNull(position.endedAt)
    assert.closeTo(Number(position.latitude), MARSEILLE.latitude, 0.0001)
    assert.closeTo(Number(position.longitude), MARSEILLE.longitude, 0.0001)
  })

  test('une nouvelle position clôt la précédente (une seule position ouverte)', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()

    await client.post(`/boats/${boat.id}/position`).loginAs(admin).form(MARSEILLE)
    await client
      .post(`/boats/${boat.id}/position`)
      .loginAs(admin)
      .form({ latitude: 43.1, longitude: 5.9 })

    const positions = await BoatPositionHistory.query().where('boatId', boat.id).orderBy('id')
    assert.lengthOf(positions, 2)
    assert.isNotNull(positions[0].endedAt)
    assert.isNull(positions[1].endedAt)
    assert.closeTo(Number(positions[1].latitude), 43.1, 0.0001)
  })

  test('des coordonnées hors plage sont refusées sans rien enregistrer', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/position`)
      .loginAs(admin)
      .form({ latitude: 95, longitude: 200 })
      .redirects(0)

    response.assertStatus(302)
    assert.isNull(await BoatPositionHistory.query().where('boatId', boat.id).first())
  })

  test("le bateau d'une autre organisation renvoie vers /boats", async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const attacker = await createAdminUser()

    const response = await client
      .post(`/boats/${boat.id}/position`)
      .loginAs(attacker)
      .form(MARSEILLE)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
    assert.isNull(await BoatPositionHistory.query().where('boatId', boat.id).first())
  })

  test('un propriétaire (lecture seule) est refusé', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const owner = await createBoatOwnerUser(admin.organizationId!)
    await boat.related('owners').attach([owner.id])

    const response = await client
      .post(`/boats/${boat.id}/position`)
      .loginAs(owner)
      .form(MARSEILLE)
      .redirects(0)

    response.assertStatus(302)
    assert.isNull(await BoatPositionHistory.query().where('boatId', boat.id).first())
  })
})
