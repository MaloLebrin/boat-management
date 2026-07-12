import { test } from '@japa/runner'
import { resolveEffectiveQuotas } from '#shared/helpers/plan'
import { PLAN_LIMITS } from '#shared/types/plan'

test.group('resolveEffectiveQuotas', () => {
  test('without module, effective quotas equal the tier quotas', ({ assert }) => {
    assert.deepEqual(resolveEffectiveQuotas('pro', []), PLAN_LIMITS.pro)
    assert.deepEqual(resolveEffectiveQuotas('starter', []), PLAN_LIMITS.starter)
    assert.deepEqual(resolveEffectiveQuotas('enterprise', []), PLAN_LIMITS.enterprise)
  })

  test('charter module grants pricing only', ({ assert }) => {
    const quotas = resolveEffectiveQuotas('pro', ['charter'])

    assert.isTrue(quotas.canManagePricing)
    assert.isFalse(quotas.canManageClients)
    assert.isFalse(quotas.canManageInvoices)
  })

  test('crm_invoicing module grants clients and invoices', ({ assert }) => {
    const quotas = resolveEffectiveQuotas('pro', ['crm_invoicing'])

    assert.isTrue(quotas.canManageClients)
    assert.isTrue(quotas.canManageInvoices)
    assert.isFalse(quotas.canManagePricing)
  })

  test('modules combine and never alter numeric quotas of the tier', ({ assert }) => {
    const quotas = resolveEffectiveQuotas('pro', ['charter', 'crm_invoicing'])

    assert.isTrue(quotas.canManagePricing)
    assert.isTrue(quotas.canManageClients)
    assert.isTrue(quotas.canManageInvoices)
    assert.equal(quotas.maxBoats, PLAN_LIMITS.pro.maxBoats)
    assert.equal(quotas.maxMembers, PLAN_LIMITS.pro.maxMembers)
    assert.equal(quotas.storageGb, PLAN_LIMITS.pro.storageGb)
    assert.equal(quotas.canWhiteLabel, PLAN_LIMITS.pro.canWhiteLabel)
  })

  test('enterprise with modules stays identical to enterprise', ({ assert }) => {
    assert.deepEqual(
      resolveEffectiveQuotas('enterprise', ['charter', 'crm_invoicing']),
      PLAN_LIMITS.enterprise
    )
  })

  test('resolution never mutates PLAN_LIMITS', ({ assert }) => {
    const before = { ...PLAN_LIMITS.pro }
    resolveEffectiveQuotas('pro', ['charter', 'crm_invoicing'])
    assert.deepEqual(PLAN_LIMITS.pro, before)
  })

  test('extra_boats add-on raises maxBoats by its quantity', ({ assert }) => {
    const quotas = resolveEffectiveQuotas('pro', [], [{ addon: 'extra_boats', quantity: 3 }])
    assert.equal(quotas.maxBoats, (PLAN_LIMITS.pro.maxBoats as number) + 3)
    // Les autres quotas numériques restent inchangés.
    assert.equal(quotas.maxMembers, PLAN_LIMITS.pro.maxMembers)
  })

  test('extra_boats combines with modules (flags + numeric raise)', ({ assert }) => {
    const quotas = resolveEffectiveQuotas(
      'pro',
      ['charter'],
      [{ addon: 'extra_boats', quantity: 5 }]
    )
    assert.isTrue(quotas.canManagePricing)
    assert.equal(quotas.maxBoats, (PLAN_LIMITS.pro.maxBoats as number) + 5)
  })

  test('extra_boats with quantity 0 leaves the tier quota unchanged', ({ assert }) => {
    const quotas = resolveEffectiveQuotas('pro', [], [{ addon: 'extra_boats', quantity: 0 }])
    assert.equal(quotas.maxBoats, PLAN_LIMITS.pro.maxBoats)
  })

  test('extra_boats never degrades an unlimited (null) quota', ({ assert }) => {
    const quotas = resolveEffectiveQuotas('enterprise', [], [{ addon: 'extra_boats', quantity: 4 }])
    assert.isNull(quotas.maxBoats)
  })
})
