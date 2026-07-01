import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'
import { BoatFactory } from '#database/factories/boat_factory'
import { UserFactory } from '#database/factories/user_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import BoatHullService from '#services/boat_hull_service'

test.group('AI boat suggestions — boatSuggestions (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST /ai/boats/:id/suggestions redirects to /login when unauthenticated', async ({
    client,
  }) => {
    const response = await client.post('/ai/boats/1/suggestions').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('POST /ai/boats/:id/suggestions redirects silently when boat not found', async ({
    client,
  }) => {
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'pro' })
    ).create()

    const response = await client.post('/ai/boats/999999/suggestions').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats/999999')
    response.assertFlashMissing('error')
  })

  test('POST /ai/boats/:id/suggestions re-throws AuthorizationException when bouncer denies', async ({
    client,
    assert,
  }) => {
    const orgA = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const orgB = await OrganizationFactory.create()
    const user = await UserFactory.merge({ organizationId: orgA.id }).create()
    const boatFromOrgB = await BoatFactory.merge({ organizationId: orgB.id }).create()

    // Bypass getForUserOrFail org-scoping to force BoatPolicy.view to return false
    // and verify E_AUTHORIZATION_FAILURE is re-thrown (not swallowed as analysisError)
    app.container.swap(
      BoatHullService,
      () =>
        ({
          getForUserOrFail: async () => boatFromOrgB,
        }) as unknown as BoatHullService
    )

    try {
      const response = await client
        .post(`/ai/boats/${boatFromOrgB.id}/suggestions`)
        .loginAs(user)
        .redirects(0)

      // Bouncer redirects back for POST HTML requests and flashes errorsBag.E_AUTHORIZATION_FAILURE
      response.assertStatus(302)
      assert.property(response.flashMessages(), 'errorsBag')
      assert.property(response.flashMessages().errorsBag as object, 'E_AUTHORIZATION_FAILURE')
    } finally {
      app.container.restore(BoatHullService)
    }
  })
})
