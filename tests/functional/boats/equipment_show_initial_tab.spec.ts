import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatEnginePartFactory } from '#database/factories/boat_engine_part_factory'
import { BoatGenericEquipmentFactory } from '#database/factories/boat_generic_equipment_factory'
import { BoatRigFactory } from '#database/factories/boat_rig_factory'
import { BoatSafetyEquipmentFactory } from '#database/factories/boat_safety_equipment_factory'
import { BoatSailFactory } from '#database/factories/boat_sail_factory'
import { createAdminUser } from '#tests/functional/helpers'

/**
 * Les six pages d'équipement à onglets reçoivent `initialTab` du serveur
 * (valeur brute de `?tab=`, `null` sans paramètre) pour que le rendu SSR parte
 * du bon onglet — même contrat que `boats.show` (#463).
 */
async function seed() {
  const user = await createAdminUser()
  const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
  const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
  const part = await BoatEnginePartFactory.merge({ boatEngineId: engine.id }).create()
  const sail = await BoatSailFactory.merge({ boatId: boat.id }).create()
  await BoatRigFactory.merge({ boatId: boat.id }).create()
  const safety = await BoatSafetyEquipmentFactory.merge({ boatId: boat.id }).create()
  const generic = await BoatGenericEquipmentFactory.merge({ boatId: boat.id }).create()
  return {
    user,
    urls: [
      { component: 'boats/engine_show', url: `/boats/${boat.id}/engines/${engine.id}` },
      {
        component: 'boats/engine_part_show',
        url: `/boats/${boat.id}/engines/${engine.id}/parts/${part.id}`,
      },
      { component: 'boats/sail_show', url: `/boats/${boat.id}/sails/${sail.id}` },
      { component: 'boats/rig_show', url: `/boats/${boat.id}/rig` },
      {
        component: 'boats/safety_equipment_show',
        url: `/boats/${boat.id}/safety-equipment/${safety.id}`,
      },
      {
        component: 'boats/generic_equipment_show',
        url: `/boats/${boat.id}/generic-equipment/${generic.id}`,
      },
    ],
  }
}

test.group('Pages d’équipement — prop initialTab (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('chaque page transmet le ?tab= demandé, ou null sans paramètre', async ({ client }) => {
    const { user, urls } = await seed()

    for (const { component, url } of urls) {
      const withTab = await client.get(`${url}?tab=photos`).loginAs(user).withInertia()
      withTab.assertStatus(200)
      withTab.assertInertiaComponent(component)
      withTab.assertInertiaPropsContains({ initialTab: 'photos' })

      const without = await client.get(url).loginAs(user).withInertia()
      without.assertStatus(200)
      without.assertInertiaPropsContains({ initialTab: null })
    }
  })
})
