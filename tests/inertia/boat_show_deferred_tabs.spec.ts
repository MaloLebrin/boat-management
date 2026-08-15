import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  Head: { template: '<div><slot /></div>' },
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
  router: { patch: vi.fn(), post: vi.fn() },
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: { template: '<form><slot :processing="false" /></form>' },
  Link: { template: '<a><slot /></a>' },
}))

import BoatShowTabContent from '../../inertia/components/boats/show/BoatShowTabContent.vue'
import BoatShow from '../../inertia/pages/boats/show.vue'
import { deferredGroupOfTab, isTabDataReady } from '../../inertia/utils/boat_show_tab_data'

const boat = { id: 13, name: 'Aventura', engines: [], sails: [], positionHistory: [] } as never

// Le squelette de page : ce que le serveur renvoie avant que les groupes de
// props différées n'arrivent (#463).
const shellProps = {
  boat,
  positionHistory: [],
  latestGpsPosition: null,
  canManageMaintenance: true,
  canManageEquipment: true,
  canManageDocuments: true,
  canManageEquipmentActions: true,
  canDeleteEquipmentActions: true,
  canDeleteIncidents: true,
  canCreateFuelLogs: true,
  canDeleteFuelLogs: true,
  canCreateNavigationLogs: true,
  canUpdateNavigationLogs: true,
  canDeleteNavigationLogs: true,
  canExport: true,
  pricing: null,
  pricingEnabled: false,
  canManagePricing: false,
} as never

const maintenanceGroup = {
  maintenanceEvents: [],
  maintenanceTasks: [],
  maintenanceSheets: [],
  boatDocuments: [],
  equipmentActions: [],
  aiSuggestions: null,
}

const navigationGroup = {
  navigationLogs: [],
  fuelLogs: [],
  incidents: [],
  portOptions: [],
  crewMemberOptions: [],
}

function tabContentProps(overrides: Record<string, unknown>) {
  return {
    ...(shellProps as unknown as Record<string, unknown>),
    isLoading: false,
    createIntent: null,
    ...overrides,
  } as never
}

describe('boats/show — onglet initial rendu côté serveur (#463)', () => {
  const originalUrl = window.location.href

  beforeEach(() => {
    window.history.replaceState({}, '', originalUrl)
  })

  afterEach(() => {
    window.history.replaceState({}, '', originalUrl)
  })

  test("ouvre directement l'onglet porté par la prop initialTab, sans lire l'URL", () => {
    // L'URL du document ne porte aucun `?tab=` : c'est le cas du rendu SSR, où
    // `window.location` n'existe pas. Sans `initialTab`, la page rendait Aperçu
    // puis basculait à l'hydratation — le flash décrit dans #463.
    window.history.replaceState({}, '', '/boats/13')

    const wrapper = mount(BoatShow, {
      props: { ...(shellProps as object), initialTab: 'history' } as never,
      shallow: true,
    })

    expect(wrapper.findComponent(BoatShowTabContent).props('tab')).toBe('history')
  })

  test('une clé de groupe en initialTab atterrit sur son premier onglet feuille', () => {
    window.history.replaceState({}, '', '/boats/13')

    const wrapper = mount(BoatShow, {
      props: { ...(shellProps as object), initialTab: 'maintenance' } as never,
      shallow: true,
    })

    expect(wrapper.findComponent(BoatShowTabContent).props('tab')).toBe('history')
  })

  test('initialTab null retombe sur Aperçu', () => {
    window.history.replaceState({}, '', '/boats/13?tab=history')

    // Le serveur fait foi : `initialTab: null` signifie « pas de ?tab= », même
    // si l'URL du navigateur en porte encore un (réécrit par un onglet précédent).
    const wrapper = mount(BoatShow, {
      props: { ...(shellProps as object), initialTab: null } as never,
      shallow: true,
    })

    expect(wrapper.findComponent(BoatShowTabContent).props('tab')).toBe('overview')
  })
})

describe('BoatShowTabContent — skeleton pendant le chargement différé (#463)', () => {
  const skeleton = '[data-testid="tab-content-skeleton"]'

  test('affiche un skeleton sur Historique tant que le groupe maintenance manque', () => {
    const wrapper = mount(BoatShowTabContent, {
      props: tabContentProps({ tab: 'history', ...navigationGroup }),
      shallow: true,
    })

    expect(wrapper.find(skeleton).exists()).toBe(true)
  })

  test('affiche un skeleton sur Journal de bord tant que le groupe navigation manque', () => {
    const wrapper = mount(BoatShowTabContent, {
      props: tabContentProps({ tab: 'navigation-logs', ...maintenanceGroup }),
      shallow: true,
    })

    expect(wrapper.find(skeleton).exists()).toBe(true)
  })

  test('rend le contenu dès que le groupe attendu est arrivé', () => {
    const wrapper = mount(BoatShowTabContent, {
      props: tabContentProps({ tab: 'history', ...maintenanceGroup, ...navigationGroup }),
      shallow: true,
    })

    expect(wrapper.find(skeleton).exists()).toBe(false)
  })

  test('un onglet sans donnée différée (Caractéristiques) ne montre aucun skeleton', () => {
    const wrapper = mount(BoatShowTabContent, {
      props: tabContentProps({ tab: 'specs' }),
      shallow: true,
    })

    expect(wrapper.find(skeleton).exists()).toBe(false)
  })

  test('un groupe partiellement arrivé compte comme non chargé', () => {
    const { crewMemberOptions, ...partialNavigation } = navigationGroup
    void crewMemberOptions

    const wrapper = mount(BoatShowTabContent, {
      props: tabContentProps({ tab: 'fuel', ...partialNavigation }),
      shallow: true,
    })

    expect(wrapper.find(skeleton).exists()).toBe(true)
  })
})

describe('boat_show_tab_data', () => {
  test('chaque onglet est rattaché au groupe qui porte ses données', () => {
    expect(deferredGroupOfTab('overview')).toBe('maintenance')
    expect(deferredGroupOfTab('history')).toBe('maintenance')
    expect(deferredGroupOfTab('admin-docs')).toBe('maintenance')
    expect(deferredGroupOfTab('navigation-logs')).toBe('navigation')
    expect(deferredGroupOfTab('incidents')).toBe('navigation')
    expect(deferredGroupOfTab('specs')).toBeNull()
    expect(deferredGroupOfTab('position')).toBeNull()
  })

  test("un onglet sans groupe est prêt même si rien n'est chargé", () => {
    const nothingLoaded = { maintenance: false, navigation: false }

    expect(isTabDataReady('specs', nothingLoaded)).toBe(true)
    expect(isTabDataReady('history', nothingLoaded)).toBe(false)
    expect(isTabDataReady('history', { maintenance: true, navigation: false })).toBe(true)
  })
})
