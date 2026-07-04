import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { test, expect, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    usePage: vi.fn(),
  }
})

import { usePage } from '@inertiajs/vue3'
import { useNavSections } from '../../inertia/composables/use_nav_sections'

function mountWithPlan(currentPlan: unknown) {
  vi.mocked(usePage).mockReturnValue({
    props: { currentPlan },
  } as ReturnType<typeof usePage>)

  let result: ReturnType<typeof useNavSections> | undefined

  mount(
    defineComponent({
      setup() {
        result = useNavSections()
        return {}
      },
      template: '<div />',
    })
  )

  return result!
}

// enterprise plan allows clients

test('enterprise plan includes nav.clients item in fleet section', () => {
  const { navSections } = mountWithPlan('enterprise')
  const fleetSection = navSections.value[0]
  const names = fleetSection.items.map((i) => i.name)
  expect(names).toContain('nav.clients')
})

// pro plan does NOT allow clients

test('pro plan does NOT include nav.clients item in fleet section', () => {
  const { navSections } = mountWithPlan('pro')
  const fleetSection = navSections.value[0]
  const names = fleetSection.items.map((i) => i.name)
  expect(names).not.toContain('nav.clients')
})

// starter plan does NOT allow clients

test('starter plan does NOT include nav.clients item in fleet section', () => {
  const { navSections } = mountWithPlan('starter')
  const fleetSection = navSections.value[0]
  const names = fleetSection.items.map((i) => i.name)
  expect(names).not.toContain('nav.clients')
})

// null / missing plan

test('null plan does NOT include nav.clients item', () => {
  const { navSections } = mountWithPlan(null)
  const fleetSection = navSections.value[0]
  const names = fleetSection.items.map((i) => i.name)
  expect(names).not.toContain('nav.clients')
})

test('undefined plan does NOT include nav.clients item', () => {
  const { navSections } = mountWithPlan(undefined)
  const fleetSection = navSections.value[0]
  const names = fleetSection.items.map((i) => i.name)
  expect(names).not.toContain('nav.clients')
})

test('unknown plan string does NOT include nav.clients item', () => {
  const { navSections } = mountWithPlan('unknown_plan')
  const fleetSection = navSections.value[0]
  const names = fleetSection.items.map((i) => i.name)
  expect(names).not.toContain('nav.clients')
})

// 4 sections are always present

test('navSections always returns 4 sections', () => {
  const { navSections } = mountWithPlan('starter')
  expect(navSections.value).toHaveLength(4)
})

test('section labels are the expected i18n keys', () => {
  const { navSections } = mountWithPlan('starter')
  const labels = navSections.value.map((s) => s.label)
  expect(labels).toContain('nav.sections.fleet')
  expect(labels).toContain('nav.sections.maintenance')
  expect(labels).toContain('nav.sections.navigation')
  expect(labels).toContain('nav.sections.preferences')
})

// fleet section base items

test('fleet section contains dashboard, boats, reservations, ports, crew', () => {
  const { navSections } = mountWithPlan('starter')
  const fleetSection = navSections.value[0]
  const names = fleetSection.items.map((i) => i.name)
  expect(names).toContain('nav.dashboard')
  expect(names).toContain('nav.myBoats')
  expect(names).toContain('nav.reservations')
  expect(names).toContain('ports.nav')
  expect(names).toContain('nav.crew')
})

// maintenance section items

test('maintenance section contains planning and history items', () => {
  const { navSections } = mountWithPlan('starter')
  const maintenanceSection = navSections.value[1]
  const names = maintenanceSection.items.map((i) => i.name)
  expect(names).toContain('nav.planning')
  expect(names).toContain('nav.history')
})
