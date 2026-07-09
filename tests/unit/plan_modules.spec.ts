import { test } from '@japa/runner'
import {
  MODULE_FLAGS,
  MODULE_PRICES,
  PLAN_LIMITS,
  PLAN_MODULES,
  isPlanModule,
} from '#shared/types/plan'

test.group('Plan modules taxonomy', () => {
  test('every module has a price and a flags entry', ({ assert }) => {
    for (const module of PLAN_MODULES) {
      assert.property(MODULE_PRICES, module)
      assert.property(MODULE_FLAGS, module)
      assert.isAbove(MODULE_PRICES[module].monthly, 0)
      assert.isAbove(MODULE_PRICES[module].annualMonthly, 0)
    }
  })

  test('annual pricing is a discount over monthly', ({ assert }) => {
    for (const module of PLAN_MODULES) {
      const price = MODULE_PRICES[module]
      assert.isBelow(price.annualMonthly, price.monthly)
      assert.equal(price.annualTotal, price.annualMonthly * 12)
    }
  })

  test('modules only grant capabilities, never revoke or alter quotas', ({ assert }) => {
    for (const module of PLAN_MODULES) {
      for (const [flag, value] of Object.entries(MODULE_FLAGS[module])) {
        assert.isTrue(value, `${module}.${flag} must be a granting boolean flag`)
      }
    }
  })

  test('enterprise already includes every flag granted by a module', ({ assert }) => {
    const enterprise = PLAN_LIMITS.enterprise as unknown as Record<string, unknown>
    for (const module of PLAN_MODULES) {
      for (const flag of Object.keys(MODULE_FLAGS[module])) {
        assert.isTrue(
          enterprise[flag] === true,
          `enterprise must include ${flag} (granted by ${module})`
        )
      }
    }
  })

  test('isPlanModule narrows valid values only', ({ assert }) => {
    assert.isTrue(isPlanModule('charter'))
    assert.isTrue(isPlanModule('crm_invoicing'))
    assert.isFalse(isPlanModule('marina'))
    assert.isFalse(isPlanModule(''))
  })
})
