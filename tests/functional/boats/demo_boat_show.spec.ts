import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Boat from '#models/boat'
import User from '#models/user'
import { seedDemoData } from '#database/seeders/sandbox_seeder'
import { DEMO_EMAIL, DEMO_ORG_SLUG } from '#shared/constants/demo'

/**
 * #478 — en session démo, la fiche bateau renvoyait une 500
 * `RuntimeException: Cannot serialize an item with null value` : le sérialiseur
 * d'@adonisjs/inertia (http-transformers) jette dès qu'une prop différée résout
 * `null`, ce qui était le cas d'`aiSuggestions` sans analyse IA en base. Le
 * rechargement partiel du groupe « maintenance » — déclenché automatiquement
 * après le rendu, et par l'onglet Fiches (`?tab=sheets`) — plantait donc pour
 * tous les bateaux de la sandbox.
 *
 * Couverture de non-régression de bout en bout sur les données réelles du
 * seeder sandbox (aucune fiche de maintenance ni analyse IA n'y est créée),
 * en complément des tests unitaires du correctif dans `boats.spec.ts`.
 */
test.group('Demo boat show (#478)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  const MAINTENANCE_PROPS = [
    'maintenanceEvents',
    'maintenanceTasks',
    'maintenanceSheets',
    'boatDocuments',
    'equipmentActions',
    'aiSuggestions',
  ]

  async function seedAndLogin() {
    await seedDemoData()
    const user = await User.query().where('email', DEMO_EMAIL).firstOrFail()
    const boats = await Boat.query()
      .whereHas('organization', (q) => q.where('slug', DEMO_ORG_SLUG))
      .orderBy('id')
    return { user, boats }
  }

  test('la visite initiale de chaque bateau du seeder sandbox répond 200', async ({
    client,
    assert,
  }) => {
    const { user, boats } = await seedAndLogin()
    assert.isAbove(boats.length, 0)

    for (const boat of boats) {
      const response = await client
        .get(`/boats/${boat.id}`)
        .loginAs(user)
        .withSession({ demoSessionStartedAt: Date.now() })
        .withInertia()

      response.assertStatus(200)
    }
  })

  test('le groupe différé « maintenance » se charge sans fiche ni analyse IA en base', async ({
    client,
    assert,
  }) => {
    const { user, boats } = await seedAndLogin()

    for (const boat of boats) {
      const response = await client
        .get(`/boats/${boat.id}?tab=sheets`)
        .loginAs(user)
        .withSession({ demoSessionStartedAt: Date.now() })
        .withInertiaPartialReload('boats/show', MAINTENANCE_PROPS)

      response.assertStatus(200)

      const props = response.inertiaProps as {
        maintenanceSheets: unknown[]
        aiSuggestions: unknown
      }
      // Aucune fiche de maintenance dans le seeder sandbox : l'onglet doit
      // recevoir un tableau vide, pas une 500.
      assert.deepEqual(props.maintenanceSheets, [])
      // Aucune analyse IA en base : la prop doit rester sérialisable (le
      // sérialiseur d'Inertia jette sur un `null` de premier niveau).
      assert.deepEqual(props.aiSuggestions, [])
    }
  })

  test('le groupe différé « navigation » se charge pour un bateau démo', async ({
    client,
    assert,
  }) => {
    const { user, boats } = await seedAndLogin()
    const boat = boats[0]

    const response = await client
      .get(`/boats/${boat.id}`)
      .loginAs(user)
      .withSession({ demoSessionStartedAt: Date.now() })
      .withInertiaPartialReload('boats/show', [
        'navigationLogs',
        'fuelLogs',
        'incidents',
        'portOptions',
        'crewMemberOptions',
      ])

    response.assertStatus(200)
    const props = response.inertiaProps as { navigationLogs: unknown[] }
    assert.isArray(props.navigationLogs)
  })
})
