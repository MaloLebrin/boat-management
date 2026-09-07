import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'
import AssistantToolsService from '#services/assistant_tools_service'
import { ASSISTANT_NAV_TARGETS } from '#shared/types/assistant'
import OrganizationMembership from '#models/organization_membership'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { UserFactory } from '#database/factories/user_factory'
import {
  createAdminUser,
  createCharterAdminUser,
  createMechanicUser,
} from '#tests/functional/helpers'

async function createEnterpriseAdmin() {
  const user = await UserFactory.with('organization', 1, (org) =>
    org.merge({ plan: 'enterprise' })
  ).create()
  await OrganizationMembership.create({
    userId: user.id,
    organizationId: user.organizationId!,
    role: 'admin',
  })
  return user
}

async function makeService() {
  return app.container.make(AssistantToolsService)
}

test.group('Assistant FleetAi — cibles de navigation (#642)', () => {
  test('chaque cible correspond à une route réellement déclarée, chemin compris', ({ assert }) => {
    const routes = router.toJSON()
    const byName = new Map<string, string>()
    for (const domainRoutes of Object.values(routes)) {
      for (const route of domainRoutes) {
        if (route.name) byName.set(route.name, route.pattern)
      }
    }
    for (const [target, { path }] of Object.entries(ASSISTANT_NAV_TARGETS)) {
      const pattern = byName.get(target)
      assert.isDefined(pattern, `route "${target}" absente du routeur`)
      assert.equal(pattern, path, `chemin de "${target}"`)
    }
  })
})

test.group('Assistant FleetAi — registre d’outils (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('un admin Entreprise voit les dix outils', async ({ assert }) => {
    const user = await createEnterpriseAdmin()
    const service = await makeService()

    const definitions = await service.definitionsFor(user)
    const names = definitions.map((d) => d.name)
    assert.sameMembers(names, [
      'list_boats',
      'get_boat',
      'get_engine',
      'list_maintenance',
      'fleet_overview',
      'list_ports',
      'list_operations',
      'list_commercial',
      'search_product_help',
      'get_organization_status',
    ])
  })

  test('un admin Pro sans module ne voit pas l’outil commercial mais garde les ports', async ({
    assert,
  }) => {
    const user = await createAdminUser()
    const service = await makeService()

    const definitions = await service.definitionsFor(user)
    const names = definitions.map((d) => d.name)
    assert.notInclude(names, 'list_commercial')
    assert.include(names, 'list_ports')
    assert.include(names, 'get_organization_status')
  })

  test('le module charter rend l’outil commercial visible sur un plan Pro', async ({ assert }) => {
    const user = await createCharterAdminUser()
    await user.load('organization')
    const service = await makeService()

    const definitions = await service.definitionsFor(user)
    const names = definitions.map((d) => d.name)
    assert.include(names, 'list_commercial')
  })

  test('un mechanic n’obtient que la maintenance et l’aide produit', async ({ assert }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const service = await makeService()

    const definitions = await service.definitionsFor(mechanic)
    const names = definitions.map((d) => d.name)
    assert.sameMembers(names, ['list_maintenance', 'search_product_help'])
  })

  test('run re-vérifie la garde : un mechanic qui appelle l’outil factures est refusé', async ({
    assert,
  }) => {
    const admin = await createCharterAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)
    const service = await makeService()

    const result = JSON.parse(
      await service.run(mechanic, {
        id: 'c1',
        name: 'list_commercial',
        arguments: { kind: 'invoices' },
      })
    ) as { error?: string }
    assert.equal(result.error, 'Not allowed for your role')
  })

  test('un nom d’outil inconnu renvoie la liste des noms valides', async ({ assert }) => {
    const user = await createAdminUser()
    const service = await makeService()

    const result = JSON.parse(
      await service.run(user, { id: 'c1', name: 'drop_database', arguments: {} })
    ) as { error?: string; validTools?: string[] }
    assert.include(result.error, 'drop_database')
    assert.include(result.validTools, 'list_boats')
  })

  test('un id de bateau d’une autre organisation ne renvoie jamais de données', async ({
    assert,
  }) => {
    const user = await createAdminUser()
    const stranger = await createAdminUser()
    const foreignBoat = await BoatFactory.merge({
      organizationId: stranger.organizationId!,
      name: 'Intrus',
    }).create()
    const service = await makeService()

    const serialized = await service.run(user, {
      id: 'c1',
      name: 'get_boat',
      arguments: { boatId: foreignBoat.id },
    })
    const result = JSON.parse(serialized) as { error?: string }
    assert.isString(result.error)
    assert.notInclude(serialized, 'Intrus')
  })

  test('un id de moteur d’une autre organisation ne renvoie jamais de données', async ({
    assert,
  }) => {
    const user = await createAdminUser()
    const stranger = await createAdminUser()
    const foreignBoat = await BoatFactory.merge({
      organizationId: stranger.organizationId!,
    }).create()
    const foreignEngine = await BoatEngineFactory.merge({ boatId: foreignBoat.id }).create()
    const service = await makeService()

    const result = JSON.parse(
      await service.run(user, {
        id: 'c1',
        name: 'get_engine',
        arguments: { engineId: foreignEngine.id },
      })
    ) as { error?: string }
    assert.equal(result.error, 'Engine not found in your fleet')
  })

  test('les arguments string sont coercés (« 22 » vaut 22)', async ({ assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({
      organizationId: user.organizationId!,
      name: 'Pen Duick',
    }).create()
    const service = await makeService()

    const result = JSON.parse(
      await service.run(user, {
        id: 'c1',
        name: 'get_boat',
        arguments: { boatId: String(boat.id) },
      })
    ) as { id?: number; name?: string }
    assert.equal(result.id, boat.id)
    assert.equal(result.name, 'Pen Duick')
  })
})
