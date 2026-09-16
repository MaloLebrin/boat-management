import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDate: (v: string) => v }),
}))

vi.mock('@inertiajs/vue3', () => ({
  Head: { template: '<div><slot /></div>' },
  usePage: vi.fn(),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { template: '<a><slot /></a>' },
}))

import { usePage } from '@inertiajs/vue3'
import Dashboard from '../../inertia/pages/dashboard.vue'

const stubs = {
  Head: { template: '<div><slot /></div>' },
  Link: { template: '<a><slot /></a>' },
  BaseAlert: { template: '<div><slot /></div>' },
  BaseButton: { template: '<button><slot /></button>' },
  BaseCard: { template: '<div><slot name="header" /><slot /></div>' },
  DashboardAiPanel: { template: '<div data-testid="ai-panel" />' },
  DashboardQuickAddActions: { template: '<div />' },
  DashboardStatsGrid: { template: '<div />' },
  NewBoatButton: { template: '<div />' },
  PortDashboardCard: { template: '<div />' },
}

function mountDashboard() {
  vi.mocked(usePage).mockReturnValue({
    props: { currentPlan: 'pro', activeModules: [], activeAddons: [] },
  } as unknown as ReturnType<typeof usePage>)

  return mount(Dashboard, {
    props: {
      boats: [],
      urgentMaintenance: [],
      stats: {
        boats: 0,
        engines: 0,
        sails: 0,
        rigs: 0,
        urgentMaintenance: 0,
        deltas: {
          boatsInAlert: 0,
          boatsWithEngine: 0,
          boatsWithSail: 0,
          boatsWithRig: 0,
          overdueCount: 0,
        },
      },
      aiFleetAnalysis: null,
      ports: [],
      portStats: { total: 0, totalBoats: 0, totalFreeSpots: 0 },
      portOptions: [],
      canCreateNavigationLogs: false,
      canCreateIncidents: false,
      canAddBoat: true,
      boatQuota: { used: 0, limit: 2 },
    },
    global: { stubs },
  })
}

/**
 * Le panneau Assistant IA partage une grille avec la colonne principale
 * (maintenance urgente + bateaux), bien plus haute que lui. Sans alignement
 * explicite, `align-items: stretch` (défaut d'une grille) l'étire jusqu'en
 * bas de la ligne : un grand aplat navy vide sous le bouton « Analyser la
 * flotte ». Le panneau doit garder la hauteur de son contenu.
 */
test('the AI panel does not stretch to the height of the main column', () => {
  const wrapper = mountDashboard()

  const row = wrapper.get('[data-testid="ai-panel"]').element.parentElement!

  expect(row.className).toContain('grid')
  expect(row.className).toContain('lg:items-start')
})
