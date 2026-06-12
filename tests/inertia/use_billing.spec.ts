import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { test, expect, vi } from 'vitest'
import { useBilling } from '../../inertia/composables/use_billing'
import type { PlanTier } from '../../shared/types/plan'

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    usePage: vi.fn(),
  }
})

import { usePage } from '@inertiajs/vue3'

function mountWithPlan(currentPlan: PlanTier | undefined) {
  vi.mocked(usePage).mockReturnValue({
    props: { currentPlan },
  } as ReturnType<typeof usePage>)

  let result: ReturnType<typeof useBilling> | undefined

  mount(
    defineComponent({
      setup() {
        result = useBilling()
        return {}
      },
      template: '<div />',
    })
  )

  return result!
}

test('isStarter is true when plan is starter', () => {
  const { isStarter, isPro, isEnterprise } = mountWithPlan('starter')
  expect(isStarter.value).toBe(true)
  expect(isPro.value).toBe(false)
  expect(isEnterprise.value).toBe(false)
})

test('isPro is true when plan is pro', () => {
  const { isStarter, isPro, isEnterprise } = mountWithPlan('pro')
  expect(isPro.value).toBe(true)
  expect(isStarter.value).toBe(false)
  expect(isEnterprise.value).toBe(false)
})

test('isEnterprise is true when plan is enterprise', () => {
  const { isEnterprise, isStarter, isPro } = mountWithPlan('enterprise')
  expect(isEnterprise.value).toBe(true)
  expect(isStarter.value).toBe(false)
  expect(isPro.value).toBe(false)
})

test('canUpgrade is true for starter plan', () => {
  const { canUpgrade } = mountWithPlan('starter')
  expect(canUpgrade.value).toBe(true)
})

test('canUpgrade is true for pro plan', () => {
  const { canUpgrade } = mountWithPlan('pro')
  expect(canUpgrade.value).toBe(true)
})

test('canUpgrade is false for enterprise plan', () => {
  const { canUpgrade } = mountWithPlan('enterprise')
  expect(canUpgrade.value).toBe(false)
})

test('currentPlan is null when prop is undefined', () => {
  const { currentPlan, canUpgrade } = mountWithPlan(undefined)
  expect(currentPlan.value).toBeNull()
  expect(canUpgrade.value).toBe(false)
})
