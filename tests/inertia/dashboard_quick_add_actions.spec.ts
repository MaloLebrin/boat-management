import { mount } from '@vue/test-utils'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import DashboardQuickAddActions from '../../inertia/components/dashboard/DashboardQuickAddActions.vue'
import type { QuotaUsage } from '../../shared/types/plan'

const { openModal, visit } = vi.hoisted(() => ({ openModal: vi.fn(), visit: vi.fn() }))

vi.mock('@inertiajs/vue3', () => ({
  router: { visit },
}))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

// Les modales sont stubbées : on ne vérifie que leur ouverture (prop `open`
// ou méthode exposée `openModal`), leur contenu a ses propres specs.
vi.mock('~/components/base/UpgradePlanModal.vue', () => ({
  default: { props: ['open'], template: '<div class="upgrade-modal" v-if="open" />' },
}))
vi.mock('~/components/navigation/QuickAddNavigationLogModal.vue', () => ({
  default: { props: ['open'], template: '<div class="logbook-modal" v-if="open" />' },
}))
vi.mock('~/components/navigation/QuickAddIncidentModal.vue', () => ({
  default: { props: ['open'], template: '<div class="incident-modal" v-if="open" />' },
}))
vi.mock('~/components/dashboard/QuickAddMaintenanceTaskModal.vue', () => ({
  default: {
    template: '<div class="task-modal" />',
    setup(_props: unknown, { expose }: { expose: (exposed: Record<string, unknown>) => void }) {
      expose({ openModal })
    },
  },
}))

const boats = [{ id: 1, name: 'Aurore' }]

function mountActions(
  overrides: Partial<{
    boats: typeof boats
    canCreateNavigationLogs: boolean
    canCreateIncidents: boolean
    canCreateMaintenanceTasks: boolean
    canAddBoat: boolean
    boatQuota: QuotaUsage['boats']
  }> = {}
) {
  return mount(DashboardQuickAddActions, {
    props: {
      boats,
      portOptions: [],
      canCreateNavigationLogs: true,
      canCreateIncidents: true,
      canCreateMaintenanceTasks: true,
      canAddBoat: true,
      boatQuota: { used: 1, limit: 8 },
      ...overrides,
    } as never,
  })
}

const trigger = 'button[aria-expanded]'
const items = '[role="menuitem"]'
const boatItem = '[data-testid="dashboard-quick-add-boat"]'

async function openMenu(w: ReturnType<typeof mountActions>) {
  await w.find(trigger).trigger('click')
  return w
}

beforeEach(() => {
  openModal.mockClear()
  visit.mockClear()
})

describe('menu « + Créer » du tableau de bord', () => {
  test('rend un seul déclencheur primaire fermé, sans item visible', () => {
    const w = mountActions()

    expect(w.findAll(trigger)).toHaveLength(1)
    expect(w.find(trigger).classes()).toContain('bg-brand')
    expect(w.find(trigger).text()).toContain('dashboard.quickAdd.menuLabel')
    expect(w.find(trigger).text()).toContain('dashboard.quickAdd.menuAria')
    expect(w.findAll(items)).toHaveLength(0)
  })

  test('ouvre les quatre items quand toutes les permissions sont accordées', async () => {
    const w = await openMenu(mountActions())

    const labels = w.findAll(items).map((item) => item.text())
    expect(labels[0]).toContain('dashboard.quickAdd.boat')
    expect(labels.slice(1)).toEqual([
      'dashboard.quickAdd.logbook',
      'dashboard.quickAdd.incident',
      'dashboard.quickAdd.task',
    ])
    // Chaque item porte son icône Heroicons.
    expect(w.findAll(`${items} svg`)).toHaveLength(4)
  })

  test('sans bateau, seul l’item « Un bateau » reste proposé', async () => {
    const w = await openMenu(mountActions({ boats: [] }))

    expect(w.findAll(items)).toHaveLength(1)
    expect(w.find(boatItem).exists()).toBe(true)
  })

  test('sans permission de création, seul l’item « Un bateau » reste proposé', async () => {
    const w = await openMenu(
      mountActions({
        canCreateNavigationLogs: false,
        canCreateIncidents: false,
        canCreateMaintenanceTasks: false,
      })
    )

    expect(w.findAll(items)).toHaveLength(1)
    expect(w.find('.task-modal').exists()).toBe(false)
  })

  test('ne masque que l’item concerné quand une seule permission manque', async () => {
    const w = await openMenu(mountActions({ canCreateIncidents: false }))

    const labels = w.findAll(items).map((item) => item.text())
    expect(labels).toHaveLength(3)
    expect(labels.join(' ')).not.toContain('dashboard.quickAdd.incident')
  })

  test('l’item bateau affiche le quota et navigue vers la création', async () => {
    const w = await openMenu(mountActions({ boatQuota: { used: 1, limit: 2 } }))

    expect(w.find(boatItem).text()).toContain('1/2')
    expect(w.find(boatItem).attributes('title')).toBeUndefined()

    await w.find(boatItem).trigger('click')
    expect(visit).toHaveBeenCalledWith('/boats/new')
    expect(w.find('.upgrade-modal').exists()).toBe(false)
    expect(w.findAll(items)).toHaveLength(0)
  })

  test('au quota : badge warning, tooltip, et upsell au lieu de naviguer', async () => {
    const w = await openMenu(mountActions({ canAddBoat: false, boatQuota: { used: 2, limit: 2 } }))

    expect(w.find(boatItem).text()).toContain('2/2')
    expect(w.find(boatItem).html()).toContain('bg-peach-100')
    expect(w.find(boatItem).attributes('title')).toBe('boats.index.quotaReached')

    await w.find(boatItem).trigger('click')
    expect(visit).not.toHaveBeenCalled()
    expect(w.find('.upgrade-modal').exists()).toBe(true)
  })

  test('masque le badge pour un quota illimité (Entreprise)', async () => {
    const w = await openMenu(mountActions({ boatQuota: { used: 5, limit: null } }))
    expect(w.find(boatItem).text()).not.toContain('5/')
  })

  test('l’item journal ouvre la modale de sortie et referme le menu', async () => {
    const w = await openMenu(mountActions())
    await w.findAll(items)[1].trigger('click')

    expect(w.find('.logbook-modal').exists()).toBe(true)
    expect(w.find('.incident-modal').exists()).toBe(false)
    expect(w.findAll(items)).toHaveLength(0)
  })

  test('l’item incident ouvre la modale d’incident et referme le menu', async () => {
    const w = await openMenu(mountActions())
    await w.findAll(items)[2].trigger('click')

    expect(w.find('.incident-modal').exists()).toBe(true)
    expect(w.find('.logbook-modal').exists()).toBe(false)
    expect(w.findAll(items)).toHaveLength(0)
  })

  test('l’item tâche appelle openModal de la modale de tâche et referme le menu', async () => {
    const w = await openMenu(mountActions())
    await w.find('[data-testid="dashboard-quick-add-task"]').trigger('click')

    expect(openModal).toHaveBeenCalledTimes(1)
    expect(w.findAll(items)).toHaveLength(0)
  })
})
