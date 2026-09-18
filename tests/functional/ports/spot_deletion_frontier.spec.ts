import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import Boat from '#models/boat'
import Pontoon from '#models/pontoon'
import Spot from '#models/spot'
import { BoatFactory } from '#database/factories/boat_factory'
import { PontoonFactory } from '#database/factories/pontoon_factory'
import { PortFactory } from '#database/factories/port_factory'
import { SpotFactory } from '#database/factories/spot_factory'
import { createEnterpriseAdminUser } from '#tests/functional/helpers'

/**
 * Supprimer un amarrage occupé est refusé **aux deux étages** (#720).
 *
 * Avant, seul le ponton était gardé : sa place, elle, se supprimait, et la clé
 * `boats.spot_id ON DELETE SET NULL` démarrait le bateau sans un mot. Il
 * suffisait donc de vider un ponton place par place pour contourner sa garde.
 * Les deux étages sont joués sur le **même décor**, pour que l'écart, s'il
 * revient, se voie ici.
 */

interface MooredBoat {
  pontoon: Pontoon
  spot: Spot
  boat: Boat
  portId: number
}

async function seedMooredBoat(organizationId: number): Promise<MooredBoat> {
  const port = await PortFactory.merge({ organizationId }).create()
  const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
  const spot = await SpotFactory.merge({ organizationId, pontoonId: pontoon.id }).create()
  const boat = await BoatFactory.merge({ organizationId, spotId: spot.id }).create()

  return { pontoon, spot, boat, portId: port.id }
}

test.group('Marina — supprimer un amarrage occupé, aux deux étages', (group) => {
  group.each.setup(() => truncateDb())

  test('le ponton occupé est protégé : rien ne bouge', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const { pontoon, spot, boat, portId } = await seedMooredBoat(user.organizationId!)

    const response = await client
      .delete(`/ports/${portId}/pontoons/${pontoon.id}`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/ports/${portId}`)
    response.assertFlashMessage('error', 'Cannot delete this pontoon: boats are assigned to it.')

    assert.isNotNull(await Pontoon.find(pontoon.id))
    assert.isNotNull(await Spot.find(spot.id))
    const moored = await Boat.findOrFail(boat.id)
    assert.equal(moored.spotId, spot.id)
  })

  test('sa place occupée est protégée de même, et le flash nomme le bateau', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const { pontoon, spot, boat, portId } = await seedMooredBoat(user.organizationId!)

    const response = await client
      .delete(`/spots/${spot.id}`)
      .header('referer', `/ports/${portId}`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/ports/${portId}`)
    response.assertFlashMessage(
      'error',
      `Cannot delete this berth: ${boat.name} is moored there. Free it first.`
    )

    assert.isNotNull(await Spot.find(spot.id), 'la place occupée est conservée')
    const moored = await Boat.findOrFail(boat.id)
    assert.equal(moored.spotId, spot.id, 'le bateau reste amarré')
    assert.isNotNull(await Pontoon.find(pontoon.id))
  })

  test('le contournement place par place ne vide plus le ponton', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const { pontoon, spot, boat, portId } = await seedMooredBoat(user.organizationId!)

    await client.delete(`/spots/${spot.id}`).loginAs(user).redirects(0)
    const response = await client
      .delete(`/ports/${portId}/pontoons/${pontoon.id}`)
      .loginAs(user)
      .redirects(0)

    response.assertFlashMessage('error', 'Cannot delete this pontoon: boats are assigned to it.')
    assert.isNotNull(await Pontoon.find(pontoon.id))
    const moored = await Boat.findOrFail(boat.id)
    assert.equal(moored.spotId, spot.id)
  })

  test('une fois le bateau démarré, la place se supprime sans flash', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const { spot, boat } = await seedMooredBoat(user.organizationId!)

    await client
      .patch(`/boats/${boat.id}/assignment`)
      .loginAs(user)
      .form({ spotId: '' })
      .redirects(0)
    const unmoored = await Boat.findOrFail(boat.id)
    assert.isNull(unmoored.spotId, 'le bateau est démarré')
    const response = await client.delete(`/spots/${spot.id}`).loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('error')
    assert.isNull(await Spot.find(spot.id))
  })
})
