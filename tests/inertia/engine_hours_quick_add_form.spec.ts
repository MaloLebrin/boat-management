import { mount } from '@vue/test-utils'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, test, vi } from 'vitest'

/**
 * #488 — saisie des heures moteur hors-ligne. L'incrément est commutatif :
 * le rejeu différé ne peut pas entrer en conflit avec une saisie en ligne
 * intercalée (le service applique `hours += increment`, jamais un set absolu).
 */

vi.mock('vue-sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockIsOnline = vi.hoisted(() => ({ value: true }))

vi.mock('~/composables/use_network_status', () => ({
  useNetworkStatus: () => ({ isOnline: mockIsOnline }),
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: {
      appT: {
        'common.offline.savedQueue': 'Enregistré hors-ligne',
        'common.offline.syncing': 'Synchronisation en cours…',
        'common.offline.syncSuccess':
          '{count, plural, one {# entrée synchronisée} other {# entrées synchronisées}}',
      },
      locale: 'fr',
      flash: {},
    },
  }),
  router: {
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template:
      '<button :type="type" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled', 'route'],
    emits: ['click'],
  },
}))

vi.mock('~/components/base/BaseInput.vue', () => ({
  default: {
    template:
      '<input :name="name" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['id', 'name', 'label', 'type', 'inputmode', 'min', 'step', 'modelValue'],
    emits: ['update:modelValue'],
  },
}))

vi.mock('~/components/base/BaseModal.vue', () => ({
  default: {
    template: '<div><slot /></div>',
    props: ['open', 'title', 'closeLabel', 'size'],
    emits: ['update:open'],
  },
}))

import { router } from '@inertiajs/vue3'
import { useOfflineQueue } from '../../inertia/composables/use_offline_queue'
import EngineHoursQuickAddForm from '../../inertia/components/boats/engine/EngineHoursQuickAddForm.vue'

const baseProps = { boatId: 4, engineId: 11, currentHours: 120 }

async function submitHours(wrapper: ReturnType<typeof mount>, value: string) {
  const input = wrapper.find('input')
  await input.setValue(value)
  await wrapper.find('form').trigger('submit')
}

describe('EngineHoursQuickAddForm — hors-ligne (#488)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsOnline.value = true
    global.indexedDB = new IDBFactory()
  })

  test('online: submits the increment via router.patch', async () => {
    const wrapper = mount(EngineHoursQuickAddForm, { props: baseProps })

    await submitHours(wrapper, '3')

    expect(vi.mocked(router.patch)).toHaveBeenCalledWith(
      '/boats/4/engines/11/hours',
      { hoursIncrement: 3 },
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('offline: enqueues the action without any network call', async () => {
    mockIsOnline.value = false
    const { pendingActions, pendingCount } = useOfflineQueue()
    const wrapper = mount(EngineHoursQuickAddForm, { props: baseProps })

    await submitHours(wrapper, '3')
    await vi.waitFor(() => expect(pendingCount.value).toBe(1), { timeout: 1000 })

    expect(vi.mocked(router.patch)).not.toHaveBeenCalled()
    expect(pendingActions.value[0]).toMatchObject({
      type: 'increment-engine-hours',
      url: '/boats/4/engines/11/hours',
      method: 'patch',
      payload: { hoursIncrement: 3 },
    })
  })

  test('offline: an invalid increment is not enqueued', async () => {
    mockIsOnline.value = false
    const { pendingCount } = useOfflineQueue()
    // Le compteur est un état partagé au niveau module : on le remet à zéro
    // car aucun refresh ne tournera si rien n'est enfilé
    pendingCount.value = 0
    const wrapper = mount(EngineHoursQuickAddForm, { props: baseProps })

    await submitHours(wrapper, '0')
    await submitHours(wrapper, 'abc')

    expect(pendingCount.value).toBe(0)
    expect(vi.mocked(router.patch)).not.toHaveBeenCalled()
  })

  test('replays the queued increment via router.patch after reconnecting', async () => {
    mockIsOnline.value = false
    const { drainQueue, pendingCount } = useOfflineQueue()
    const wrapper = mount(EngineHoursQuickAddForm, { props: baseProps })
    await submitHours(wrapper, '5')
    await vi.waitFor(() => expect(pendingCount.value).toBe(1), { timeout: 1000 })

    // Retour en ligne : le drain rejoue l'action avec le payload d'origine
    mockIsOnline.value = true
    vi.mocked(router.patch).mockImplementation((_url, _data, options) => {
      ;(options as { onSuccess?: () => void })?.onSuccess?.()
      return undefined as never
    })
    await drainQueue()
    await vi.waitFor(() => expect(pendingCount.value).toBe(0), { timeout: 1000 })

    expect(vi.mocked(router.patch)).toHaveBeenCalledWith(
      '/boats/4/engines/11/hours',
      { hoursIncrement: 5 },
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('the queue type label is translated in both locales', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    for (const locale of ['en', 'fr'] as const) {
      const json = JSON.parse(
        readFileSync(resolve(__dirname, `../../resources/lang/${locale}/common.json`), 'utf8')
      ) as Record<string, string>
      expect(
        json['offline.queue.type.increment-engine-hours'],
        `offline.queue.type.increment-engine-hours (${locale})`
      ).toBeTruthy()
    }
  })
})
