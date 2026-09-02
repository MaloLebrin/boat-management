import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { QueuedAction } from '../../inertia/composables/use_offline_queue'

/**
 * #622 — un état des lieux saisi hors-ligne est dérivé de la file (et non d'un
 * état local perdu au rechargement). Le panneau le rend avec ses défauts en
 * attente, mais refuse explicitement checklist et photos, qui exigent un ID réel.
 */

// Faux `ref` : `vi.hoisted` s'exécute avant l'import de Vue.
const mockPendingActions = vi.hoisted(() => ({ value: [] as QueuedAction[] }))

vi.mock('~/composables/use_offline_queue', () => ({
  useOfflineQueue: () => ({ pendingActions: mockPendingActions, enqueue: vi.fn() }),
  newTempId: () => 'tmp_generated',
  isTempId: (value: unknown) => typeof value === 'string' && value.startsWith('tmp_'),
}))

vi.mock('~/composables/use_network_status', () => ({
  useNetworkStatus: () => ({ isOnline: { value: false } }),
}))

vi.mock('@inertiajs/vue3', () => ({
  router: { delete: vi.fn(), patch: vi.fn(), post: vi.fn() },
  useForm: (initial: Record<string, unknown>) => ({
    ...initial,
    errors: {},
    processing: false,
    transform: () => ({ post: vi.fn(), put: vi.fn() }),
  }),
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

import InspectionPanel from '../../inertia/components/reservations/inspection/InspectionPanel.vue'
import { usePendingInspection } from '../../inertia/composables/use_pending_inspection'

const CREATE_URL = '/boats/3/reservations/7/inspections'
const TEMP_ID = 'tmp_checkout1'

function queueCreation(kind: 'checkout' | 'checkin' = 'checkout'): QueuedAction {
  return {
    id: 1,
    type: 'create-inspection',
    url: CREATE_URL,
    method: 'post',
    payload: { kind, performedAt: '2026-09-02T10:00', fuelLevel: 75, notes: 'Plein fait' },
    createdAt: '2026-09-02T10:00:00.000Z',
    tempId: TEMP_ID,
  }
}

function queueDefect(): QueuedAction {
  return {
    id: 2,
    type: 'create-inspection-defect',
    url: `${CREATE_URL}/${TEMP_ID}/equipment-actions`,
    method: 'post',
    payload: { label: 'Taquet arraché', actionType: 'to_repair', estimatedCost: 90 },
    createdAt: '2026-09-02T10:05:00.000Z',
    dependsOn: TEMP_ID,
  }
}

const panelProps = {
  boatId: 3,
  reservationId: 7,
  kind: 'checkout' as const,
  inspection: null,
  category: null,
  counterpart: null,
  canEdit: true,
  canDelete: true,
  canManageActions: true,
  canDeleteActions: true,
}

const stubs = {
  BaseCard: { template: '<div><slot /></div>' },
  BaseButton: { template: '<button><slot /></button>' },
  InspectionForm: { template: '<form />' },
  InspectionChecklist: { template: '<div data-test="checklist" />' },
  InspectionPhotos: { template: '<div data-test="photos" />' },
  InspectionDefects: {
    template:
      '<div data-test="defects" :data-inspection-id="inspectionId" :data-can-delete="String(canDelete)" />',
    props: ['boatId', 'reservationId', 'inspectionId', 'actions', 'canManage', 'canDelete'],
  },
}

describe('usePendingInspection (#622)', () => {
  beforeEach(() => {
    mockPendingActions.value = []
  })

  test('derives the inspection and its queued defects from the queue', () => {
    mockPendingActions.value = [queueCreation(), queueDefect()]

    const pending = usePendingInspection(3, 7, 'checkout')

    expect(pending.value?.id).toBe(TEMP_ID)
    expect(pending.value?.performedAt).toBe('2026-09-02T10:00')
    expect(pending.value?.fuelLevel).toBe(75)
    expect(pending.value?.notes).toBe('Plein fait')
    expect(pending.value?.actions).toHaveLength(1)
    expect(pending.value?.actions[0].label).toBe('Taquet arraché')
    expect(pending.value?.actions[0].estimatedCost).toBe(90)
    // ID négatif : jamais confondu avec une ligne réelle.
    expect(pending.value!.actions[0].id).toBeLessThan(0)
  })

  test('ignores a creation queued for the other kind or another reservation', () => {
    mockPendingActions.value = [queueCreation('checkin')]
    expect(usePendingInspection(3, 7, 'checkout').value).toBeNull()

    mockPendingActions.value = [queueCreation()]
    expect(usePendingInspection(3, 99, 'checkout').value).toBeNull()
  })

  test('a defect attached to another temp id is not picked up', () => {
    mockPendingActions.value = [queueCreation(), { ...queueDefect(), dependsOn: 'tmp_other' }]
    expect(usePendingInspection(3, 7, 'checkout').value?.actions).toHaveLength(0)
  })

  test('returns null when the queue is empty', () => {
    expect(usePendingInspection(3, 7, 'checkout').value).toBeNull()
  })
})

describe('InspectionPanel — état des lieux en attente (#622)', () => {
  beforeEach(() => {
    mockPendingActions.value = []
  })

  test('renders the pending badge and defects, refuses checklist and photos', () => {
    mockPendingActions.value = [queueCreation(), queueDefect()]

    const wrapper = mount(InspectionPanel, { props: panelProps, global: { stubs } })

    expect(wrapper.text()).toContain('inspections.pending.badge')
    expect(wrapper.text()).toContain('inspections.pending.checklistUnavailable')
    expect(wrapper.text()).toContain('inspections.pending.photosUnavailable')
    expect(wrapper.find('[data-test="checklist"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="photos"]').exists()).toBe(false)

    const defects = wrapper.find('[data-test="defects"]')
    expect(defects.exists()).toBe(true)
    expect(defects.attributes('data-inspection-id')).toBe(TEMP_ID)
    // Rien à supprimer côté serveur tant que l'inspection n'est pas synchronisée.
    expect(defects.attributes('data-can-delete')).toBe('false')
  })

  test('a synced inspection wins over the queued one and restores checklist and photos', () => {
    mockPendingActions.value = [queueCreation(), queueDefect()]
    const inspection = {
      id: 9,
      reservationId: 7,
      kind: 'checkout' as const,
      performedAt: '2026-09-02T08:00:00.000Z',
      fuelLevel: 80,
      engineHours: null,
      notes: null,
      createdAt: '2026-09-02T08:00:00.000Z',
      updatedAt: '2026-09-02T08:00:00.000Z',
      photos: [],
      actions: [],
      items: [],
    }

    const wrapper = mount(InspectionPanel, {
      props: { ...panelProps, inspection },
      global: { stubs },
    })

    expect(wrapper.text()).not.toContain('inspections.pending.badge')
    expect(wrapper.find('[data-test="checklist"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="photos"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="defects"]').attributes('data-inspection-id')).toBe('9')
  })

  test('without any inspection the empty state is shown to a read-only user', () => {
    const wrapper = mount(InspectionPanel, {
      props: { ...panelProps, canEdit: false },
      global: { stubs },
    })

    expect(wrapper.text()).toContain('inspections.empty.checkout')
    expect(wrapper.find('[data-test="defects"]').exists()).toBe(false)
  })

  test('pending keys exist in both locales', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    for (const locale of ['en', 'fr'] as const) {
      const file = JSON.parse(
        readFileSync(resolve(__dirname, `../../resources/lang/${locale}/inspections.json`), 'utf8')
      ) as { pending: Record<string, string> }
      for (const key of ['badge', 'description', 'checklistUnavailable', 'photosUnavailable']) {
        expect(file.pending[key], `inspections.pending.${key} (${locale})`).toBeTruthy()
      }
    }
  })
})
