import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import BoatMaintenanceSheetItemList from '../../inertia/components/boats/sheets/BoatMaintenanceSheetItemList.vue'
import type { MaintenanceSheetItemRow } from '../../inertia/types/boat_show'

/**
 * #490 — hors-ligne sur les fiches d'entretien : état optimiste (la case
 * reflète le clic sans réseau), enqueue dédupliqué avec `_expectedUpdatedAt`,
 * et notes sans debounce hors-ligne (rien n'est perdu au démontage).
 */

const mockIsOnline = vi.hoisted(() => ({ value: true }))
const mockEnqueue = vi.hoisted(() => vi.fn())
const mockRouterPut = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => ({
  router: { put: mockRouterPut },
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/composables/use_network_status', () => ({
  useNetworkStatus: () => ({ isOnline: mockIsOnline }),
}))

vi.mock('~/composables/use_offline_queue', () => ({
  useOfflineQueue: () => ({ enqueue: mockEnqueue }),
}))

vi.mock('~/components/base/BaseTextarea.vue', () => ({
  default: {
    template:
      '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @focusout="$emit(\'focusout\')" />',
    props: ['modelValue', 'placeholder', 'rows', 'compact', 'class'],
    emits: ['update:modelValue', 'focusout'],
  },
}))

function item(
  id: number,
  overrides: Partial<MaintenanceSheetItemRow> = {}
): MaintenanceSheetItemRow {
  return {
    id,
    label: `Item ${id}`,
    isDone: false,
    notes: null,
    position: id,
    updatedAt: '2026-08-25T08:00:00.000+00:00',
    ...overrides,
  }
}

const baseProps = {
  boat: { id: 4 },
  sheet: { id: 9 },
  canManage: true,
}

function mountList(items: MaintenanceSheetItemRow[]) {
  return mount(BoatMaintenanceSheetItemList, {
    props: { ...baseProps, items } as never,
  })
}

const ITEM_URL = '/boats/4/maintenance-sheets/9/items/1'

describe('BoatMaintenanceSheetItemList — hors-ligne (#490)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    mockIsOnline.value = true
  })

  test('online: toggling an item sends router.put without _expectedUpdatedAt', async () => {
    const wrapper = mountList([item(1)])

    await wrapper.find('button').trigger('click')

    expect(mockRouterPut).toHaveBeenCalledWith(
      ITEM_URL,
      { isDone: true, notes: '' },
      expect.objectContaining({ preserveScroll: true })
    )
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  test('offline: toggling enqueues a deduped action carrying _expectedUpdatedAt', async () => {
    mockIsOnline.value = false
    const wrapper = mountList([item(1)])

    await wrapper.find('button').trigger('click')

    expect(mockEnqueue).toHaveBeenCalledWith({
      type: 'update-sheet-item',
      url: ITEM_URL,
      method: 'put',
      payload: {
        isDone: true,
        notes: '',
        _expectedUpdatedAt: '2026-08-25T08:00:00.000+00:00',
      },
      dedupeKey: `update-sheet-item:${ITEM_URL}`,
    })
    expect(mockRouterPut).not.toHaveBeenCalled()
  })

  test('offline: the checkbox reflects the click optimistically', async () => {
    mockIsOnline.value = false
    const wrapper = mountList([item(1)])

    expect(wrapper.find('svg').exists()).toBe(false)
    await wrapper.find('button').trigger('click')

    // La coche apparaît alors que item.isDone (prop) est resté false
    expect(wrapper.find('svg').exists()).toBe(true)

    // Second clic : re-décoche (une seule action grâce à la dédup, dernière valeur)
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('svg').exists()).toBe(false)
    expect(mockEnqueue).toHaveBeenLastCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ isDone: false }) })
    )
  })

  test('optimistic state reconciles with the props once the server catches up', async () => {
    mockIsOnline.value = false
    const wrapper = mountList([item(1)])
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('svg').exists()).toBe(true)

    // Retour en ligne : les props Inertia arrivent avec isDone=true
    await wrapper.setProps({ items: [item(1, { isDone: true })] } as never)
    expect(wrapper.find('svg').exists()).toBe(true)

    // Puis quelqu'un décoche côté serveur : la prop redevient la source de vérité
    await wrapper.setProps({ items: [item(1, { isDone: false })] } as never)
    expect(wrapper.find('svg').exists()).toBe(false)
  })

  test('offline: notes are enqueued immediately, without the 600 ms debounce', async () => {
    mockIsOnline.value = false
    const wrapper = mountList([item(1)])

    await wrapper.find('textarea').setValue('vidange faite')

    expect(mockEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ notes: 'vidange faite' }),
        dedupeKey: `update-sheet-item:${ITEM_URL}`,
      })
    )
  })

  test('online: notes stay debounced and flush on unmount', async () => {
    vi.useFakeTimers()
    const wrapper = mountList([item(1)])

    await wrapper.find('textarea').setValue('en cours')
    expect(mockRouterPut).not.toHaveBeenCalled()

    // Démontage avant l'expiration du debounce : la saisie n'est pas perdue
    wrapper.unmount()
    expect(mockRouterPut).toHaveBeenCalledWith(
      ITEM_URL,
      { isDone: false, notes: 'en cours' },
      expect.objectContaining({ preserveScroll: true })
    )
    vi.useRealTimers()
  })

  test('online: notes are sent after the debounce delay', async () => {
    vi.useFakeTimers()
    const wrapper = mountList([item(1)])

    await wrapper.find('textarea').setValue('après debounce')
    vi.advanceTimersByTime(600)

    expect(mockRouterPut).toHaveBeenCalledWith(
      ITEM_URL,
      { isDone: false, notes: 'après debounce' },
      expect.objectContaining({ preserveScroll: true })
    )
    vi.useRealTimers()
  })

  test('queue type label is translated in both locales', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    for (const locale of ['en', 'fr'] as const) {
      const json = JSON.parse(
        readFileSync(resolve(__dirname, `../../resources/lang/${locale}/common.json`), 'utf8')
      ) as Record<string, string>
      expect(
        json['offline.queue.type.update-sheet-item'],
        `offline.queue.type.update-sheet-item (${locale})`
      ).toBeTruthy()
      expect(json['sheetItem.field.isDone'], `sheetItem.field.isDone (${locale})`).toBeTruthy()
    }
  })
})
