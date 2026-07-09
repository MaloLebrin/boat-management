import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { test, expect, vi } from 'vitest'

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    usePage: vi.fn(),
  }
})

import { usePage } from '@inertiajs/vue3'
import { usePlan } from '../../inertia/composables/use_plan'

function mountWithProps(props: Record<string, unknown>) {
  vi.mocked(usePage).mockReturnValue({ props } as ReturnType<typeof usePage>)

  let result: ReturnType<typeof usePlan> | undefined
  mount(
    defineComponent({
      setup() {
        result = usePlan()
        return {}
      },
      template: '<div />',
    })
  )
  return result!
}

// currentPlan

test('currentPlan returns the plan when it is a valid tier', () => {
  const { currentPlan } = mountWithProps({ currentPlan: 'pro' })
  expect(currentPlan.value).toBe('pro')
})

test('currentPlan is null for an unknown, missing or non-string plan', () => {
  expect(mountWithProps({ currentPlan: 'unknown' }).currentPlan.value).toBeNull()
  expect(mountWithProps({ currentPlan: undefined }).currentPlan.value).toBeNull()
  expect(mountWithProps({ currentPlan: 42 }).currentPlan.value).toBeNull()
})

// activeModules

test('activeModules keeps only valid module strings', () => {
  const { activeModules } = mountWithProps({
    currentPlan: 'pro',
    activeModules: ['charter', 'marina', 'crm_invoicing', 7, null],
  })
  expect(activeModules.value).toEqual(['charter', 'crm_invoicing'])
})

test('activeModules is empty when the prop is absent or not an array', () => {
  expect(mountWithProps({ currentPlan: 'pro' }).activeModules.value).toEqual([])
  expect(
    mountWithProps({ currentPlan: 'pro', activeModules: 'charter' }).activeModules.value
  ).toEqual([])
})

// effectiveQuotas

test('effectiveQuotas is null when there is no valid plan', () => {
  const { effectiveQuotas } = mountWithProps({ currentPlan: undefined })
  expect(effectiveQuotas.value).toBeNull()
})

test('effectiveQuotas reflects the tier alone without modules', () => {
  const { effectiveQuotas } = mountWithProps({ currentPlan: 'pro', activeModules: [] })
  expect(effectiveQuotas.value?.canManageClients).toBe(false)
  expect(effectiveQuotas.value?.canManagePricing).toBe(false)
  expect(effectiveQuotas.value?.canManageInvoices).toBe(false)
})

test('effectiveQuotas merges the flags granted by active modules', () => {
  const { effectiveQuotas } = mountWithProps({
    currentPlan: 'pro',
    activeModules: ['charter', 'crm_invoicing'],
  })
  expect(effectiveQuotas.value?.canManagePricing).toBe(true)
  expect(effectiveQuotas.value?.canManageClients).toBe(true)
  expect(effectiveQuotas.value?.canManageInvoices).toBe(true)
})

test('a module never lifts numeric quotas of the tier', () => {
  const { effectiveQuotas } = mountWithProps({
    currentPlan: 'pro',
    activeModules: ['crm_invoicing'],
  })
  // Pro reste plafonné à 25 bateaux même avec un module actif
  expect(effectiveQuotas.value?.maxBoats).toBe(25)
})
