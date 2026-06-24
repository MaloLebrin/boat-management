import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser } from '#tests/functional/helpers'
import { UserFactory } from '#database/factories/user_factory'

test.group('Budget CSV export (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /boats/:id/export/budget.csv returns CSV for authenticated owner', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .get(`/boats/${boat.id}/export/budget.csv`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(200)
    response.assertHeader('content-type', 'text/csv; charset=utf-8')
  })

  test('GET /boats/:id/export/budget.csv redirects to /login when unauthenticated', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/boats/${boat.id}/export/budget.csv`).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('GET /boats/:id/export/budget.csv redirects to /boats for unknown boat', async ({
    client,
  }) => {
    const user = await createAdminUser()

    const response = await client.get('/boats/999999/export/budget.csv').loginAs(user)

    response.assertRedirectsTo('/boats')
  })

  test('GET /boats/:id/export/budget.csv is inaccessible from another org', async ({
    client,
    assert,
  }) => {
    const owner = await createAdminUser()
    const other = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()

    const response = await client
      .get(`/boats/${boat.id}/export/budget.csv`)
      .loginAs(other)
      .redirects(0)

    // redirected away — either /boats or an error, never a CSV
    assert.notEqual(response.status(), 200)
  })

  test('GET /boats/:id/export/budget.csv with year param returns CSV for that year', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .get(`/boats/${boat.id}/export/budget.csv`)
      .qs({ year: 2023 })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(200)
    const text = response.text()
    // CSV should contain a total row
    assert.include(text, 'TOTAL')
  })
})
