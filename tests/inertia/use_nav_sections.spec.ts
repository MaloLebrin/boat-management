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

// La section business n'existe que si au moins un item est accordé par le
// plan ou un module (#595) : on la retrouve par son label plutôt que par un
// index figé, et une section absente équivaut à une liste vide.
function businessNames(navSections: ReturnType<typeof useNavSections>['navSections']): string[] {
  const section = navSections.value.find((s) => s.label === 'nav.sections.business')
  return section ? section.items.map((i) => i.name) : []
}

// enterprise plan allows clients

test('enterprise plan includes nav.clients item in business section', () => {
  const { navSections } = mountWithPlan('enterprise')
  const names = businessNames(navSections)
  expect(names).toContain('nav.clients')
})

// pro plan does NOT allow clients

test('pro plan does NOT include nav.clients item in business section', () => {
  const { navSections } = mountWithPlan('pro')
  const names = businessNames(navSections)
  expect(names).not.toContain('nav.clients')
})

// starter plan does NOT allow clients

test('starter plan does NOT include nav.clients item in business section', () => {
  const { navSections } = mountWithPlan('starter')
  const names = businessNames(navSections)
  expect(names).not.toContain('nav.clients')
})

// null / missing plan

test('null plan does NOT include nav.clients item', () => {
  const { navSections } = mountWithPlan(null)
  const names = businessNames(navSections)
  expect(names).not.toContain('nav.clients')
})

test('undefined plan does NOT include nav.clients item', () => {
  const { navSections } = mountWithPlan(undefined)
  const names = businessNames(navSections)
  expect(names).not.toContain('nav.clients')
})

test('unknown plan string does NOT include nav.clients item', () => {
  const { navSections } = mountWithPlan('unknown_plan')
  const names = businessNames(navSections)
  expect(names).not.toContain('nav.clients')
})

// modules add-ons (épic #327)

test('pro plan with crm_invoicing module includes clients and invoices items', () => {
  const { navSections } = mountWithPlan('pro', ['crm_invoicing'])
  const names = businessNames(navSections)
  expect(names).toContain('nav.clients')
  expect(names).toContain('nav.invoices')
  expect(names).not.toContain('nav.pricingSeasons')
})

test('pro plan with charter module includes pricing seasons and reservations, not CRM items', () => {
  const { navSections } = mountWithPlan('pro', ['charter'])
  const names = businessNames(navSections)
  expect(names).toContain('nav.pricingSeasons')
  expect(names).toContain('nav.reservations')
  expect(names).not.toContain('nav.clients')
  expect(names).not.toContain('nav.invoices')
})

test('starter plan with a module still resolves the granted flags', () => {
  const { navSections } = mountWithPlan('starter', ['crm_invoicing'])
  const names = businessNames(navSections)
  expect(names).toContain('nav.clients')
})

test('invalid activeModules values are ignored', () => {
  const { navSections } = mountWithPlan('pro', ['marina', 42, null])
  const names = businessNames(navSections)
  expect(names).not.toContain('nav.clients')
  expect(names).not.toContain('nav.pricingSeasons')
})

test('missing activeModules prop falls back to tier flags only', () => {
  const { navSections } = mountWithPlan('enterprise', undefined)
  const names = businessNames(navSections)
  expect(names).toContain('nav.clients')
})

// cartographie de port réservée aux plans Pro et Entreprise (#604)

const FLEET_SECTION_INDEX = 0

test('pro plan includes ports.nav item in fleet section', () => {
  const { navSections } = mountWithPlan('pro')
  const names = navSections.value[FLEET_SECTION_INDEX].items.map((i) => i.name)
  expect(names).toContain('ports.nav')
})

test('enterprise plan includes ports.nav item in fleet section', () => {
  const { navSections } = mountWithPlan('enterprise')
  const names = navSections.value[FLEET_SECTION_INDEX].items.map((i) => i.name)
  expect(names).toContain('ports.nav')
})

test('starter plan does NOT include ports.nav item in fleet section', () => {
  const { navSections } = mountWithPlan('starter')
  const names = navSections.value[FLEET_SECTION_INDEX].items.map((i) => i.name)
  expect(names).not.toContain('ports.nav')
})

test('null plan does NOT include ports.nav item', () => {
  const { navSections } = mountWithPlan(null)
  const names = navSections.value[FLEET_SECTION_INDEX].items.map((i) => i.name)
  expect(names).not.toContain('ports.nav')
})

test('no module grants ports on a starter plan', () => {
  const { navSections } = mountWithPlan('starter', ['crm_invoicing', 'charter'])
  const names = navSections.value[FLEET_SECTION_INDEX].items.map((i) => i.name)
  expect(names).not.toContain('ports.nav')
})

test('a pro plan without the ports.view capability does NOT include ports.nav', () => {
  const withoutPortsView = MEMBER_CAPABILITIES.filter((c) => c !== 'ports.view')
  const { navSections } = mountWithPlan('pro', [], withoutPortsView)
  const names = navSections.value[FLEET_SECTION_INDEX].items.map((i) => i.name)
  expect(names).not.toContain('ports.nav')
})

// sections présentes par plan — la section business n'apparaît que si un plan
// ou un module accorde au moins un de ses items (#595)

test('starter plan returns 3 sections — no business item is granted', () => {
  const { navSections } = mountWithPlan('starter')
  expect(navSections.value).toHaveLength(3)
  const labels = navSections.value.map((s) => s.label)
  expect(labels).toContain('nav.sections.fleet')
  expect(labels).toContain('nav.sections.activity')
  expect(labels).toContain('nav.sections.maintenance')
  expect(labels).not.toContain('nav.sections.business')
})

test('enterprise plan returns the 4 sections including business', () => {
  const { navSections } = mountWithPlan('enterprise')
  expect(navSections.value).toHaveLength(4)
  const labels = navSections.value.map((s) => s.label)
  expect(labels).toContain('nav.sections.business')
})

// fleet section base items

// Plan `pro` : depuis #604 la cartographie de port est fermée au plan Starter,
// c'est donc le premier plan où la section flotte est au complet.
test('fleet section contains dashboard, boats, engines, ports, crew', () => {
  const { navSections } = mountWithPlan('pro')
  const fleetSection = navSections.value[0]
  const names = fleetSection.items.map((i) => i.name)
  expect(names).toContain('nav.dashboard')
  expect(names).toContain('nav.boats')
  expect(names).toContain('nav.engines')
  expect(names).toContain('ports.nav')
  expect(names).toContain('nav.crew')
})

// L'inventaire moteur (#598) est gardé par `boats.view`, comme la route
// serveur : sans cette capability, le lien serait mort.
test('engines item is gated behind boats.view, like /boats', () => {
  const withoutBoats = mountWithPlan(
    'pro',
    [],
    MEMBER_CAPABILITIES.filter((c) => c !== 'boats.view')
  )
  const names = withoutBoats.navSections.value[0].items.map((i) => i.name)
  expect(names).not.toContain('nav.engines')
  expect(names).not.toContain('nav.boats')
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

// réservations gatées par le module Location / plan Entreprise (#595) — même
// garde que `RequireReservationsPlanMiddleware` côté serveur, sinon lien mort.

test('enterprise plan includes nav.reservations item in business section', () => {
  const { navSections } = mountWithPlan('enterprise')
  expect(businessNames(navSections)).toContain('nav.reservations')
})

test('pro plan with charter module includes nav.reservations item', () => {
  const { navSections } = mountWithPlan('pro', ['charter'])
  expect(businessNames(navSections)).toContain('nav.reservations')
})

test('pro plan without module does NOT include nav.reservations item', () => {
  const { navSections } = mountWithPlan('pro')
  expect(businessNames(navSections)).not.toContain('nav.reservations')
})

test('starter plan does NOT include nav.reservations item', () => {
  const { navSections } = mountWithPlan('starter')
  expect(businessNames(navSections)).not.toContain('nav.reservations')
})

test('crm_invoicing module does NOT grant nav.reservations', () => {
  const { navSections } = mountWithPlan('pro', ['crm_invoicing'])
  expect(businessNames(navSections)).not.toContain('nav.reservations')
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
  expect(maintenanceNames).toEqual([
    'nav.planning',
    'nav.history',
    'nav.diagnostic',
    'nav.spareParts',
  ])
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
