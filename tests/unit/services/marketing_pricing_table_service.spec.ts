import { test } from '@japa/runner'
import MarketingPricingTableService from '#services/marketing_pricing_table_service'
import { ADDON_PRICES, PLAN_LIMITS, PLAN_PRICES } from '#shared/types/plan'
import { formatPrice } from '#shared/helpers/number_format'

/** `t` de test : renvoie la clé et les paramètres, pour vérifier ce qui est demandé. */
const t = (key: string, params?: Record<string, string>) =>
  params ? `${key}:${JSON.stringify(params)}` : key

test.group('MarketingPricingTableService (unit)', () => {
  test('copyParams derives every amount and quota from the plan catalogue', ({ assert }) => {
    const service = new MarketingPricingTableService()

    const params = service.copyParams('fr')

    assert.equal(params.starterBoats, String(PLAN_LIMITS.starter.maxBoats))
    assert.equal(params.proBoats, String(PLAN_LIMITS.pro.maxBoats))
    assert.equal(params.proMonthly, formatPrice(PLAN_PRICES.pro.monthly, 'fr'))
    assert.equal(params.enterpriseAnnual, formatPrice(PLAN_PRICES.enterprise.annualMonthly, 'fr'))
    assert.equal(params.extraBoatPrice, formatPrice(ADDON_PRICES.extra_boats.monthly, 'fr'))
    assert.equal(params.fleetBoats, '15')
    const extraBoats = Math.max(15 - (PLAN_LIMITS.pro.maxBoats ?? 0), 0)
    assert.equal(
      params.fleetTotal,
      formatPrice(PLAN_PRICES.pro.monthly + extraBoats * ADDON_PRICES.extra_boats.monthly, 'fr')
    )
  })

  test('copyParams formats prices in the requested locale', ({ assert }) => {
    const service = new MarketingPricingTableService()

    assert.equal(service.copyParams('en').proMonthly, formatPrice(PLAN_PRICES.pro.monthly, 'en'))
    assert.notEqual(service.copyParams('en').proMonthly, service.copyParams('fr').proMonthly)
  })

  test('quotaCell uses the unlimited key for null and the bounded key with the count otherwise', ({
    assert,
  }) => {
    const service = new MarketingPricingTableService()

    assert.equal(service.quotaCell(t, null, 'bounded', 'unlimited'), 'unlimited')
    assert.equal(service.quotaCell(t, 8, 'bounded', 'unlimited'), 'bounded:{"count":"8"}')
  })

  test('flagRow reads the capability flag of each tier', ({ assert }) => {
    const service = new MarketingPricingTableService()

    assert.deepEqual(service.flagRow(t, 'label', 'canUseAI'), [
      'label',
      PLAN_LIMITS.starter.canUseAI,
      PLAN_LIMITS.pro.canUseAI,
      PLAN_LIMITS.enterprise.canUseAI,
    ])
  })

  test('auditCell distinguishes no audit log, bounded retention and unlimited', ({ assert }) => {
    const service = new MarketingPricingTableService()

    assert.isFalse(service.auditCell(t, 0))
    assert.equal(service.auditCell(t, 90), 'table_g3_r3_p:{"count":"90"}')
    assert.equal(service.auditCell(t, null), 'table_g3_r3_e')
  })
})
