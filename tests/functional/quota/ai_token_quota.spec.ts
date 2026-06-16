import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { OrganizationFactory } from '#database/factories/organization_factory'
import AiTokenQuotaService from '#services/ai_token_quota_service'
import AiTokenUsage from '#models/ai_token_usage'
import { QuotaExceededError } from '#exceptions/quota_errors'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'

test.group('AiTokenQuota (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('getUsage returns 0 when no record exists', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = await app.container.make(AiTokenQuotaService)

    const usage = await svc.getUsage(org.id)
    assert.equal(usage, 0)
  })

  test('getUsage returns current month tokens', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = await app.container.make(AiTokenQuotaService)
    const month = svc.currentMonthKey()

    await AiTokenUsage.create({ organizationId: org.id, month, tokensUsed: 42000 })

    const usage = await svc.getUsage(org.id)
    assert.equal(usage, 42000)
  })

  test('assertCanUseTokens does not throw when under limit', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = await app.container.make(AiTokenQuotaService)

    assert.doesNotThrow(() => svc.assertCanUseTokens(org, 500_000))
  })

  test('assertCanUseTokens throws QuotaExceededError when at limit', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = await app.container.make(AiTokenQuotaService)

    assert.throws(() => svc.assertCanUseTokens(org, 1_000_000), 'Quota exceeded: ai_tokens')
  })

  test('assertCanUseTokens does not throw for enterprise (unlimited)', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'enterprise' }).create()
    const svc = await app.container.make(AiTokenQuotaService)

    assert.doesNotThrow(() => svc.assertCanUseTokens(org, 5_000_000))
  })

  test('recordUsage creates a new row on first call', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = await app.container.make(AiTokenQuotaService)

    await svc.recordUsage(org, 1000)

    const month = svc.currentMonthKey()
    const row = await AiTokenUsage.query()
      .where('organizationId', org.id)
      .where('month', month)
      .first()
    assert.isNotNull(row)
    assert.equal(Number(row!.tokensUsed), 1000)
  })

  test('recordUsage increments existing row', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = await app.container.make(AiTokenQuotaService)
    const month = svc.currentMonthKey()

    await AiTokenUsage.create({ organizationId: org.id, month, tokensUsed: 5000 })

    await svc.recordUsage(org, 3000)

    const row = await AiTokenUsage.query()
      .where('organizationId', org.id)
      .where('month', month)
      .first()
    assert.equal(Number(row!.tokensUsed), 8000)
  })

  test('recordUsage ignores zero tokens', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = await app.container.make(AiTokenQuotaService)

    await svc.recordUsage(org, 0)

    const rows = await AiTokenUsage.query().where('organizationId', org.id)
    assert.equal(rows.length, 0)
  })

  test('resetMonth deletes records for that month', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = await app.container.make(AiTokenQuotaService)
    const month = DateTime.now().minus({ months: 1 }).toFormat('yyyy-MM')

    await AiTokenUsage.create({ organizationId: org.id, month, tokensUsed: 99000 })

    await svc.resetMonth(month)

    const row = await AiTokenUsage.query()
      .where('organizationId', org.id)
      .where('month', month)
      .first()
    assert.isNull(row)
  })

  test('QuotaExceededError for ai_tokens has correct fields', ({ assert }) => {
    const error = new QuotaExceededError('ai_tokens', {
      limit: 1_000_000,
      current: 1_000_001,
      upgradeTo: 'enterprise',
    })
    assert.equal(error.feature, 'ai_tokens')
    assert.equal(error.limit, 1_000_000)
    assert.equal(error.current, 1_000_001)
    assert.equal(error.upgradeTo, 'enterprise')
  })
})
