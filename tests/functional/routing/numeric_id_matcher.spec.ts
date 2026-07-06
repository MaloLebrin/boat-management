import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser } from '#tests/functional/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

/**
 * Régression issue #280 : un paramètre de route `:id` (ou `:boatId`…) non
 * numérique doit produire un 404 natif (la route ne matche pas le matcher
 * numérique global) plutôt qu'un 500 déclenché par `Number('abc') = NaN`
 * transmis à PostgreSQL.
 *
 * Le matching de route intervient avant les middlewares d'auth, donc un
 * segment non numérique renvoie 404 même sans authentification.
 */
test.group('Numeric :id route matcher (issue #280)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  const nonNumericRoutes: { method: 'get' | 'put' | 'delete'; url: string }[] = [
    { method: 'get', url: '/boats/not-a-number' },
    { method: 'put', url: '/boats/not-a-number' },
    { method: 'delete', url: '/boats/not-a-number' },
    { method: 'get', url: '/boats/abc/budget' },
    { method: 'get', url: '/clients/not-a-number' },
    { method: 'put', url: '/clients/not-a-number' },
    { method: 'delete', url: '/clients/not-a-number' },
    { method: 'put', url: '/crew/not-a-number' },
    { method: 'delete', url: '/crew/not-a-number' },
  ]

  for (const route of nonNumericRoutes) {
    test(`${route.method.toUpperCase()} ${route.url} → 404 (not 500)`, async ({ client }) => {
      const user = await createAdminUser()

      const response = await client[route.method](route.url).loginAs(user)

      response.assertStatus(404)
    })
  }

  test('a numeric :id still matches the route (matcher is not over-blocking)', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/boats/${boat.id}`).loginAs(user)

    response.assertStatus(200)
  })
})
