import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'
import AuditLog from '#models/audit_log'
import AuditLogService from '#services/audit_log_service'
import { DateTime } from 'luxon'

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

  test('POST /logout creates an audit log entry', async ({ client, assert }) => {
    const user = await createAdminUser()

    await client.post('/logout').loginAs(user)

    const log = await AuditLog.query()
      .where('organizationId', user.organizationId!)
      .where('action', 'logout')
      .first()

    assert.isNotNull(log)
    assert.equal(log!.userId, user.id)
  })

  test('GET /settings/audit-log?action=login returns 200 with valid action filter', async ({
    client,
  }) => {
    const user = await createAdminUser()

    const response = await client.get('/settings/audit-log?action=login').loginAs(user)

    response.assertStatus(200)
  })

  test('GET /settings/audit-log?action=invalid redirects back on invalid action', async ({
    client,
  }) => {
    const user = await createAdminUser()

    const response = await client
      .get('/settings/audit-log?action=invalid_action')
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
  })

  test('GET /settings/audit-log?userId= filters by user', async ({ client }) => {
    const user = await createAdminUser()

    const response = await client.get(`/settings/audit-log?userId=${user.id}`).loginAs(user)

    response.assertStatus(200)
  })

  test('GET /settings/audit-log?page=2 returns 200', async ({ client }) => {
    const user = await createAdminUser()

    for (let i = 0; i < 26; i++) {
      await AuditLog.create({
        organizationId: user.organizationId!,
        userId: user.id,
        action: 'login',
      })
    }

    const response = await client.get('/settings/audit-log?page=2').loginAs(user)

    response.assertStatus(200)
  })

  test('purgeExpired deletes all Starter org logs', async ({ assert }) => {
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'starter' })
    ).create()

    await AuditLog.create({
      organizationId: user.organizationId!,
      userId: user.id,
      action: 'login',
    })

    const service = new AuditLogService()
    await service.purgeExpired()

    const count = await AuditLog.query()
      .where('organizationId', user.organizationId!)
      .count('* as total')
    assert.equal(Number(count[0].$extras.total), 0)
  })

  test('purgeExpired deletes Pro logs older than 90 days but keeps recent ones', async ({
    assert,
  }) => {
    const user = await createAdminUser()

    const oldLog = await AuditLog.create({
      organizationId: user.organizationId!,
      userId: user.id,
      action: 'login',
    })
    await AuditLog.query()
      .where('id', oldLog.id)
      .update({
        createdAt: DateTime.now().minus({ days: 91 }).toSQL(),
      })

    await AuditLog.create({
      organizationId: user.organizationId!,
      userId: user.id,
      action: 'login',
    })

    const service = new AuditLogService()
    await service.purgeExpired()

    const remaining = await AuditLog.query().where('organizationId', user.organizationId!)
    assert.equal(remaining.length, 1)
  })

  test('purgeExpired keeps all Enterprise logs', async ({ assert }) => {
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'enterprise' })
    ).create()

    const oldLog = await AuditLog.create({
      organizationId: user.organizationId!,
      userId: user.id,
      action: 'login',
    })
    await AuditLog.query()
      .where('id', oldLog.id)
      .update({
        createdAt: DateTime.now().minus({ years: 2 }).toSQL(),
      })

    const service = new AuditLogService()
    await service.purgeExpired()

    const count = await AuditLog.query()
      .where('organizationId', user.organizationId!)
      .count('* as total')
    assert.equal(Number(count[0].$extras.total), 1)
  })
})
