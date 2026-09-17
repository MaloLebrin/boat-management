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
import { assertPageContract } from '#tests/support/inertia_page'

/**
 * Les six pages d'équipement à onglets reçoivent `initialTab` du serveur
 * (valeur brute de `?tab=`, `null` sans paramètre) pour que le rendu SSR parte
 * du bon onglet — même contrat que `boats.show` (#463).
 *
 * Ces six cas tenaient dans une seule boucle jusqu'à #689. Le nom du composant
 * y était lu dans un tableau : l'assertion était juste, mais aucune garde
 * statique ne pouvait la compter, et un échec ne disait pas *quelle* page avait
 * cassé. Un test par page, avec son nom en toutes lettres, corrige les deux.
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
    urls: {
      engine: `/boats/${boat.id}/engines/${engine.id}`,
      enginePart: `/boats/${boat.id}/engines/${engine.id}/parts/${part.id}`,
      sail: `/boats/${boat.id}/sails/${sail.id}`,
      rig: `/boats/${boat.id}/rig`,
      safety: `/boats/${boat.id}/safety-equipment/${safety.id}`,
      generic: `/boats/${boat.id}/generic-equipment/${generic.id}`,
    },
  }
}

test.group('Pages d’équipement — prop initialTab (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('la fiche moteur transmet le ?tab= demandé, ou null sans paramètre', async ({
    client,
    assert,
  }) => {
    const { user, urls } = await seed()

    const withTab = await client.get(`${urls.engine}?tab=photos`).loginAs(user).withInertia()
    assertPageContract(assert, withTab, 'boats/engine_show')
    withTab.assertInertiaPropsContains({ initialTab: 'photos' })

    const without = await client.get(urls.engine).loginAs(user).withInertia()
    assertPageContract(assert, without, 'boats/engine_show')
    without.assertInertiaPropsContains({ initialTab: null })
  })

  test('la fiche pièce moteur transmet le ?tab= demandé, ou null', async ({ client, assert }) => {
    const { user, urls } = await seed()

    const withTab = await client.get(`${urls.enginePart}?tab=photos`).loginAs(user).withInertia()
    assertPageContract(assert, withTab, 'boats/engine_part_show')
    withTab.assertInertiaPropsContains({ initialTab: 'photos' })

    const without = await client.get(urls.enginePart).loginAs(user).withInertia()
    assertPageContract(assert, without, 'boats/engine_part_show')
    without.assertInertiaPropsContains({ initialTab: null })
  })

  test('la fiche voile transmet le ?tab= demandé, ou null', async ({ client, assert }) => {
    const { user, urls } = await seed()

    const withTab = await client.get(`${urls.sail}?tab=photos`).loginAs(user).withInertia()
    assertPageContract(assert, withTab, 'boats/sail_show')
    withTab.assertInertiaPropsContains({ initialTab: 'photos' })

    const without = await client.get(urls.sail).loginAs(user).withInertia()
    assertPageContract(assert, without, 'boats/sail_show')
    without.assertInertiaPropsContains({ initialTab: null })
  })

  test('la fiche gréement transmet le ?tab= demandé, ou null', async ({ client, assert }) => {
    const { user, urls } = await seed()

    const withTab = await client.get(`${urls.rig}?tab=photos`).loginAs(user).withInertia()
    assertPageContract(assert, withTab, 'boats/rig_show')
    withTab.assertInertiaPropsContains({ initialTab: 'photos' })

    const without = await client.get(urls.rig).loginAs(user).withInertia()
    assertPageContract(assert, without, 'boats/rig_show')
    without.assertInertiaPropsContains({ initialTab: null })
  })

  test('la fiche matériel de sécurité transmet le ?tab= demandé, ou null', async ({
    client,
    assert,
  }) => {
    const { user, urls } = await seed()

    const withTab = await client.get(`${urls.safety}?tab=photos`).loginAs(user).withInertia()
    assertPageContract(assert, withTab, 'boats/safety_equipment_show')
    withTab.assertInertiaPropsContains({ initialTab: 'photos' })

    const without = await client.get(urls.safety).loginAs(user).withInertia()
    assertPageContract(assert, without, 'boats/safety_equipment_show')
    without.assertInertiaPropsContains({ initialTab: null })
  })

  test('la fiche équipement générique transmet le ?tab= demandé, ou null', async ({
    client,
    assert,
  }) => {
    const { user, urls } = await seed()

    const withTab = await client.get(`${urls.generic}?tab=photos`).loginAs(user).withInertia()
    assertPageContract(assert, withTab, 'boats/generic_equipment_show')
    withTab.assertInertiaPropsContains({ initialTab: 'photos' })

    const without = await client.get(urls.generic).loginAs(user).withInertia()
    assertPageContract(assert, without, 'boats/generic_equipment_show')
    without.assertInertiaPropsContains({ initialTab: null })
  })
})
