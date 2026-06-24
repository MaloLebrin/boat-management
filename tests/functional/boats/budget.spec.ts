import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { BoatFactory } from '#database/factories/boat_factory'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'

test.group('Budget (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /boats/:id/budget returns 200 for authenticated owner', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/boats/${boat.id}/budget`).loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('boats/budget')
  })

  test('GET /boats/:id/budget redirects to /login when unauthenticated', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/boats/${boat.id}/budget`).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('GET /boats/:id/budget redirects to /boats when boat not found', async ({ client }) => {
    const user = await createAdminUser()

    const response = await client.get('/boats/999999/budget').loginAs(user)

    response.assertRedirectsTo('/boats')
  })

  test('GET /boats/:id/budget redirects to /boats when boat belongs to another org', async ({
    client,
  }) => {
    const owner = await createAdminUser()
    const other = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()

    const response = await client.get(`/boats/${boat.id}/budget`).loginAs(other)

    response.assertRedirectsTo('/boats')
  })

  test('GET /boats/:id/budget passes year prop to Inertia', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .get(`/boats/${boat.id}/budget`)
      .qs({ year: 2024 })
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaPropsContains({ year: 2024 })
  })

  test('GET /boats/:id/budget defaults year to current year when omitted', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/boats/${boat.id}/budget`).loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps
    assert.equal(props.year, new Date().getFullYear())
  })

  test('GET /boats/:id/budget returns empty monthly totals for a boat with no data', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/boats/${boat.id}/budget`).loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps
    const budget = props.budget as { totals: { total: number }; monthly: unknown[] }
    assert.equal(budget.totals.total, 0)
    assert.lengthOf(budget.monthly, 12)
  })
})
