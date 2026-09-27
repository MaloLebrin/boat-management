import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import type User from '#models/user'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import AiAnalysisService from '#services/ai_analysis_service'
import {
  createAdminUser,
  createBoatOwnerUser,
  createMechanicUser,
  createMemberUser,
} from '#tests/functional/helpers'

/**
 * Outils moteur et analyse IA flotte gardés par capability (#900). Suite de
 * #845 : ces actions s'arrêtaient au scope organisation (ou à un
 * `hasPermission` en dur hors policy).
 *
 * - pages moteur flotte (diagnostic, premier contact, pièces) : `maintenance.view`,
 *   boat_owner → portail `/owner/boats`
 * - analyse IA flotte : `boats.view` — le mechanic, qui a son propre tableau de
 *   bord sans KPIs flotte, est refusé comme le boat_owner
 */

type Role = 'admin' | 'member' | 'mechanic' | 'boat_owner'

async function seedFleet() {
  const admin = await createAdminUser()
  const orgId = admin.organizationId!
  const boat = await BoatFactory.merge({ organizationId: orgId }).create()
  await BoatEngineFactory.merge({
    boatId: boat.id,
    kind: 'outboard',
    fuel: 'essence',
    strokeType: '2_stroke',
    family: 'outboard_2t',
  }).create()
  return { admin, orgId }
}

async function userFor(role: Role): Promise<User> {
  const { admin, orgId } = await seedFleet()
  if (role === 'admin') return admin
  if (role === 'member') return createMemberUser(orgId)
  if (role === 'mechanic') return createMechanicUser(orgId)
  return createBoatOwnerUser(orgId)
}

const ENGINE_PAGES = ['/diagnostic', '/diagnostic/first-contact', '/spare-parts']

test.group('Outils moteur flotte — garde par capability (#900)', (group) => {
  group.each.setup(() => truncateDb())

  for (const path of ENGINE_PAGES) {
    test(`boat_owner sur ${path} → redirigé vers son portail`, async ({ client }) => {
      const owner = await userFor('boat_owner')

      const response = await client.get(path).loginAs(owner).redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', '/owner/boats')
    })

    for (const role of ['admin', 'member', 'mechanic'] as const) {
      test(`${role} sur ${path} → 200`, async ({ client }) => {
        const user = await userFor(role)

        const response = await client.get(path).loginAs(user).withInertia()

        response.assertStatus(200)
      })
    }
  }
})

test.group('Analyse IA flotte — garde par capability (#900)', (group) => {
  let calls: number

  group.each.setup(async () => {
    await truncateDb()
    calls = 0
    // Aucun appel Mistral : seul compte le fait que le contrôleur atteigne le service.
    app.container.swap(
      AiAnalysisService,
      () =>
        ({
          generateFleetAnalysis: async () => {
            calls++
            return []
          },
        }) as unknown as AiAnalysisService
    )
    return () => app.container.restore(AiAnalysisService)
  })

  for (const role of ['admin', 'member'] as const) {
    test(`${role} → analyse lancée, retour au tableau de bord`, async ({ client, assert }) => {
      const user = await userFor(role)

      const response = await client.post('/ai/fleet-analysis').loginAs(user).redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', '/')
      assert.equal(calls, 1)
    })
  }

  for (const role of ['mechanic', 'boat_owner'] as const) {
    test(`${role} → refusé sans consommer le quota IA`, async ({ client, assert }) => {
      const user = await userFor(role)

      const response = await client.post('/ai/fleet-analysis').loginAs(user).redirects(0)

      // Bouncer renvoie en arrière sur un POST HTML avec errorsBag.E_AUTHORIZATION_FAILURE.
      response.assertStatus(302)
      assert.property(response.flashMessages().errorsBag as object, 'E_AUTHORIZATION_FAILURE')
      assert.equal(calls, 0)
    })
  }
})
