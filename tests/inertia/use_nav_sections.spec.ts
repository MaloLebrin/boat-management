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
import type { Capability } from '../../shared/types/permissions'

// Toutes les capabilities `member` — cf. shared/types/permissions.ts. Ces tests
// couvrent le filtrage par plan/module ; le rôle reste `member` sauf précision
// contraire (voir la section "capability filtering" plus bas pour mechanic/admin).
const MEMBER_CAPABILITIES: Capability[] = [
  'members.view',
  'invitations.view',
  'audit_log.view',
  'boats.view',
  'boats.create',
  'boats.edit',
  'boats.manage',
  'boats.reservations.delete',
  'clients.create',
  'clients.update',
  'crew.create',
  'crew.update',
  'fuel_logs.create',
  'equipmentActions.view',
  'equipmentActions.create',
  'equipmentActions.edit',
  'incidents.view',
  'incidents.create',
  'incidents.edit',
  'inspections.view',
  'inspections.create',
  'inspections.edit',
  'invoices.view',
  'invoices.create',
  'invoices.update',
  'maintenance.view',
  'maintenance.create',
  'maintenance.edit',
  'mouillages.view',
  'navigation_logs.create',
  'navigation_logs.update',
  'ports.view',
  'pricing_seasons.create',
  'pricing_seasons.update',
  'rentalContracts.view',
  'rentalContracts.create',
  'rentalContracts.edit',
  'spots.view',
  'spots.create',
  'spots.edit',
  'subscription.view',
]

function mountWithPlan(
  currentPlan: unknown,
  activeModules: unknown = [],
  capabilities: Capability[] = MEMBER_CAPABILITIES,
  role: string | null = 'member'
) {
  vi.mocked(usePage).mockReturnValue({
    props: { currentPlan, activeModules, permissions: { role, capabilities } },
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

// business section index (fleet=0, activity=1, maintenance=2, business=3)
const BUSINESS_SECTION_INDEX = 3

// enterprise plan allows clients

test('enterprise plan includes nav.clients item in business section', () => {
  const { navSections } = mountWithPlan('enterprise')
  const businessSection = navSections.value[BUSINESS_SECTION_INDEX]
  const names = businessSection.items.map((i) => i.name)
  expect(names).toContain('nav.clients')
})

// pro plan does NOT allow clients

test('pro plan does NOT include nav.clients item in business section', () => {
  const { navSections } = mountWithPlan('pro')
  const businessSection = navSections.value[BUSINESS_SECTION_INDEX]
  const names = businessSection.items.map((i) => i.name)
  expect(names).not.toContain('nav.clients')
})

// starter plan does NOT allow clients

test('starter plan does NOT include nav.clients item in business section', () => {
  const { navSections } = mountWithPlan('starter')
  const businessSection = navSections.value[BUSINESS_SECTION_INDEX]
  const names = businessSection.items.map((i) => i.name)
  expect(names).not.toContain('nav.clients')
})

// null / missing plan

test('null plan does NOT include nav.clients item', () => {
  const { navSections } = mountWithPlan(null)
  const businessSection = navSections.value[BUSINESS_SECTION_INDEX]
  const names = businessSection.items.map((i) => i.name)
  expect(names).not.toContain('nav.clients')
})

test('undefined plan does NOT include nav.clients item', () => {
  const { navSections } = mountWithPlan(undefined)
  const businessSection = navSections.value[BUSINESS_SECTION_INDEX]
  const names = businessSection.items.map((i) => i.name)
  expect(names).not.toContain('nav.clients')
})

test('unknown plan string does NOT include nav.clients item', () => {
  const { navSections } = mountWithPlan('unknown_plan')
  const businessSection = navSections.value[BUSINESS_SECTION_INDEX]
  const names = businessSection.items.map((i) => i.name)
  expect(names).not.toContain('nav.clients')
})

// modules add-ons (épic #327)

test('pro plan with crm_invoicing module includes clients and invoices items', () => {
  const { navSections } = mountWithPlan('pro', ['crm_invoicing'])
  const businessSection = navSections.value[BUSINESS_SECTION_INDEX]
  const names = businessSection.items.map((i) => i.name)
  expect(names).toContain('nav.clients')
  expect(names).toContain('nav.invoices')
  expect(names).not.toContain('nav.pricingSeasons')
})

test('pro plan with charter module includes pricing seasons item only', () => {
  const { navSections } = mountWithPlan('pro', ['charter'])
  const businessSection = navSections.value[BUSINESS_SECTION_INDEX]
  const names = businessSection.items.map((i) => i.name)
  expect(names).toContain('nav.pricingSeasons')
  expect(names).not.toContain('nav.clients')
  expect(names).not.toContain('nav.invoices')
})

test('starter plan with a module still resolves the granted flags', () => {
  const { navSections } = mountWithPlan('starter', ['crm_invoicing'])
  const businessSection = navSections.value[BUSINESS_SECTION_INDEX]
  const names = businessSection.items.map((i) => i.name)
  expect(names).toContain('nav.clients')
})

test('invalid activeModules values are ignored', () => {
  const { navSections } = mountWithPlan('pro', ['marina', 42, null])
  const businessSection = navSections.value[BUSINESS_SECTION_INDEX]
  const names = businessSection.items.map((i) => i.name)
  expect(names).not.toContain('nav.clients')
  expect(names).not.toContain('nav.pricingSeasons')
})

test('missing activeModules prop falls back to tier flags only', () => {
  const { navSections } = mountWithPlan('enterprise', undefined)
  const businessSection = navSections.value[BUSINESS_SECTION_INDEX]
  const names = businessSection.items.map((i) => i.name)
  expect(names).toContain('nav.clients')
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
  expect(labels).toContain('nav.sections.activity')
  expect(labels).toContain('nav.sections.maintenance')
  expect(labels).toContain('nav.sections.business')
})

// fleet section base items

test('fleet section contains dashboard, boats, ports, crew', () => {
  const { navSections } = mountWithPlan('starter')
  const fleetSection = navSections.value[0]
  const names = fleetSection.items.map((i) => i.name)
  expect(names).toContain('nav.dashboard')
  expect(names).toContain('nav.myBoats')
  expect(names).toContain('ports.nav')
  expect(names).toContain('nav.crew')
})

// activity section items

test('activity section contains logbook, fuel and incidents items', () => {
  const { navSections } = mountWithPlan('starter')
  const activitySection = navSections.value[1]
  const names = activitySection.items.map((i) => i.name)
  expect(names).toContain('nav.logbook')
  expect(names).toContain('nav.fuel')
  expect(names).toContain('nav.incidents')
})

// maintenance section items

test('maintenance section contains planning and history items', () => {
  const { navSections } = mountWithPlan('starter')
  const maintenanceSection = navSections.value[2]
  const names = maintenanceSection.items.map((i) => i.name)
  expect(names).toContain('nav.planning')
  expect(names).toContain('nav.history')
})

// business section base items

test('business section always contains reservations', () => {
  const { navSections } = mountWithPlan('starter')
  const businessSection = navSections.value[BUSINESS_SECTION_INDEX]
  const names = businessSection.items.map((i) => i.name)
  expect(names).toContain('nav.reservations')
})

// settings item pinned outside navSections

test('settingsItem exposes the settings link', () => {
  const { settingsItem } = mountWithPlan('starter')
  expect(settingsItem.value).toEqual({
    name: 'nav.settings',
    path: '/settings',
    route: null,
    icon: 'gear',
  })
})

// capability filtering (#397) — a mechanic only has maintenance.* capabilities,
// no boats.view/incidents.view/etc., so most sections/items must disappear
// instead of linking to pages that now 403 (cf. #396).

test('mechanic sees only dashboard (fleet) and the maintenance section', () => {
  const { navSections } = mountWithPlan(
    'enterprise',
    [],
    ['maintenance.view', 'maintenance.create', 'maintenance.edit'],
    'mechanic'
  )

  expect(navSections.value).toHaveLength(2)
  const labels = navSections.value.map((s) => s.label)
  expect(labels).toEqual(['nav.sections.fleet', 'nav.sections.maintenance'])

  const fleetNames = navSections.value[0].items.map((i) => i.name)
  expect(fleetNames).toEqual(['nav.dashboard'])

  const maintenanceNames = navSections.value[1].items.map((i) => i.name)
  expect(maintenanceNames).toEqual(['nav.planning', 'nav.history'])
})

test('a user with zero capabilities only sees the dashboard item', () => {
  const { navSections } = mountWithPlan('enterprise', [], [], 'member')

  expect(navSections.value).toHaveLength(1)
  expect(navSections.value[0].items.map((i) => i.name)).toEqual(['nav.dashboard'])
})

test('boat_owner still gets the dedicated portal-only section regardless of capabilities/plan', () => {
  const { navSections } = mountWithPlan('enterprise', [], [], 'boat_owner')

  expect(navSections.value).toHaveLength(1)
  expect(navSections.value[0].items).toEqual([
    { name: 'nav.myBoats', path: '/owner/boats', route: null, icon: 'boat' },
  ])
})
