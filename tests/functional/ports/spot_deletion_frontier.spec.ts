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
 * ⚠️ **Caractérisation, pas validation** (#695, suivi par #720).
 *
 * Deux suppressions voisines, deux comportements opposés — et c'est leur écart
 * qui est le signal, pas chaque cas pris isolément. C'est pourquoi ils sont
 * dans le même fichier, joués sur le **même décor** :
 *
 * - supprimer un **ponton** occupé est refusé, avec un flash ;
 * - supprimer une **place** de ce même ponton passe, et le bateau est démarré
 *   sans un mot — la clé étrangère `boats.spot_id` est `ON DELETE SET NULL`.
 *
 * Autrement dit, la garde d'un étage se contourne à l'étage du dessous. Ces
 * tests figent l'état actuel ; ils tomberont le jour où #720 sera tranchée, et
 * c'est exactement ce qu'on leur demande.
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
    // `PontoonService.deleteForPort` compte les bateaux amarrés sur les places
    // du ponton et lève `PontoonHasBoatsError` avant toute écriture.
    response.assertFlashMessage('error', 'Cannot delete this pontoon: boats are assigned to it.')

    assert.isNotNull(await Pontoon.find(pontoon.id))
    assert.isNotNull(await Spot.find(spot.id))
    const moored = await Boat.findOrFail(boat.id)
    assert.equal(moored.spotId, spot.id)
  })

  test('sa place, elle, se supprime — et démarre le bateau en silence', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const { pontoon, spot, boat } = await seedMooredBoat(user.organizationId!)

    const response = await client.delete(`/spots/${spot.id}`).loginAs(user).redirects(0)

    response.assertStatus(302)

    assert.isNull(await Spot.find(spot.id), 'la place occupée a bien été supprimée')
    const unmoored = await Boat.findOrFail(boat.id)
    assert.isNull(unmoored.spotId, 'le bateau a été démarré par la cascade SET NULL')
    // Le ponton, lui, est toujours là : la protection de l'étage du dessus n'a
    // servi à rien, il suffisait de vider ses places une à une.
    assert.isNotNull(await Pontoon.find(pontoon.id))
  })

  test('… sans le moindre message pour le dire', async ({ client }) => {
    const user = await createEnterpriseAdminUser()
    const { spot } = await seedMooredBoat(user.organizationId!)

    const response = await client.delete(`/spots/${spot.id}`).loginAs(user).redirects(0)

    // Aucun flash, d'aucune nature : l'exploitant revient sur l'écran précédent
    // et son bateau a perdu son amarrage sans qu'on l'en informe.
    response.assertFlashMissing('error')
    response.assertFlashMissing('success')
  })

  test('le ponton devient supprimable une fois ses places retirées', async ({ client, assert }) => {
    // Le contournement complet, joué de bout en bout : c'est la démonstration
    // que la garde du ponton ne protège rien de plus qu'un clic.
    const user = await createEnterpriseAdminUser()
    const { pontoon, spot, boat, portId } = await seedMooredBoat(user.organizationId!)

    await client.delete(`/spots/${spot.id}`).loginAs(user).redirects(0)
    const response = await client
      .delete(`/ports/${portId}/pontoons/${pontoon.id}`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    assert.isNull(await Pontoon.find(pontoon.id))
    const reloaded = await Boat.findOrFail(boat.id)
    assert.isNull(reloaded.spotId)
  })
})
