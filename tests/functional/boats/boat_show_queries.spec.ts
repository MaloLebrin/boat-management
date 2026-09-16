import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser, createMemberUser } from '#tests/functional/helpers'
import { countQueries } from '#tests/utils/query_counter'

const MEMBERSHIPS = 'organization_memberships'

/**
 * Garde-fou de la mémoïsation du rôle (`User#getRoleInOrg`) : la page bateau
 * enchaîne le middleware Inertia, `PermissionService.sharedProps` et une
 * dizaine de checks Bouncer, qui relisaient chacun `organization_memberships`.
 */
test.group('Boat show — membership queries (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('an admin page load reads the membership at most once', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const queries = await countQueries(
      async () => {
        const response = await client.get(`/boats/${boat.id}`).loginAs(user)
        response.assertStatus(200)
      },
      { table: MEMBERSHIPS }
    )

    assert.isAtMost(queries, 1)
  })

  test('a member page load reads the membership at most once', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const user = await createMemberUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const queries = await countQueries(
      async () => {
        const response = await client.get(`/boats/${boat.id}`).loginAs(user)
        response.assertStatus(200)
      },
      { table: MEMBERSHIPS }
    )

    assert.isAtMost(queries, 1)
  })
})

/**
 * Garde-fou de la vague 1.2 : le middleware Inertia chargeait l'organisation
 * trois fois par rendu et lisait `organization_modules` deux fois (modules
 * puis add-ons) avant que les policies ne recalculent les quotas effectifs.
 */
test.group('Boat show — organization queries (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('an admin page load reads the organization at most once', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const queries = await countQueries(
      async () => {
        const response = await client.get(`/boats/${boat.id}`).loginAs(user)
        response.assertStatus(200)
      },
      { table: 'organizations' }
    )

    assert.isAtMost(queries, 1)
  })

  test('an admin page load reads the organization modules at most once', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const queries = await countQueries(
      async () => {
        const response = await client.get(`/boats/${boat.id}`).loginAs(user)
        response.assertStatus(200)
      },
      { table: 'organization_modules' }
    )

    assert.isAtMost(queries, 1)
  })
})
