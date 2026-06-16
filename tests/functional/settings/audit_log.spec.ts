import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'
import AuditLog from '#models/audit_log'

test.group('AuditLog (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /settings/audit-log returns 200 for Pro plan admin', async ({ client }) => {
    const user = await createAdminUser()

    const response = await client.get('/settings/audit-log').loginAs(user)

    response.assertStatus(200)
  })

  test('GET /settings/audit-log redirects to /login when unauthenticated', async ({ client }) => {
    const response = await client.get('/settings/audit-log').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('GET /settings/audit-log redirects Starter plan users to billing', async ({ client }) => {
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'starter' })
    ).create()

    const response = await client.get('/settings/audit-log').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/settings/billing')
  })

  test('POST /login creates an audit log entry', async ({ client, assert }) => {
    const user = await createAdminUser()

    await client.post('/login').form({
      email: user.email,
      password: 'Password123!',
    })

    const log = await AuditLog.query()
      .where('organizationId', user.organizationId!)
      .where('action', 'login')
      .first()

    assert.isNotNull(log)
    assert.equal(log!.userId, user.id)
  })
})
