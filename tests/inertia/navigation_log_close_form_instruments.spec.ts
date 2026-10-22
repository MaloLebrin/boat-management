import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { describe, expect, test, vi } from 'vitest'
import NavigationLogCloseForm from '../../inertia/components/boats/show/tabs/NavigationLogCloseForm.vue'

// Contrairement à `navigation_log_close_form.spec.ts`, le formulaire est ici
// réactif et construit depuis les valeurs initiales passées à `useForm`.
vi.mock('@inertiajs/vue3', () => ({
  useForm: (data: Record<string, unknown>) =>
    reactive({ ...data, errors: {}, processing: false, patch: vi.fn(), data: () => ({ ...data }) }),
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/composables/use_network_status', () => ({
  useNetworkStatus: () => ({ isOnline: { value: true } }),
}))

vi.mock('~/composables/use_offline_queue', () => ({
  useOfflineQueue: () => ({ enqueue: vi.fn() }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :type="type"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled', 'route'],
  },
}))

const log = {
  id: 5,
  boatId: 7,
  status: 'in_progress',
  windForceBeaufort: null,
  seaState: null,
  crewCount: null,
  notes: null,
  updatedAt: '2026-06-24T10:05:00.000Z',
  crew: [],
} as any

function hoursInput(wrapper: ReturnType<typeof mount>) {
  return wrapper.find('#engineHoursEnd').element as HTMLInputElement
}

describe('NavigationLogCloseForm — heures issues des instruments (#991)', () => {
  test('préremplit les heures du moteur unique tenu par les instruments', () => {
    const wrapper = mount(NavigationLogCloseForm, {
      props: {
        boatId: 7,
        log,
        portOptions: [],
        engineOptions: [{ id: 1, label: 'Yanmar', instrumentHours: 812 }],
      },
    })

    expect(hoursInput(wrapper).value).toBe('812')
  })

  test('laisse le champ vide pour un moteur à saisie manuelle', () => {
    const wrapper = mount(NavigationLogCloseForm, {
      props: {
        boatId: 7,
        log,
        portOptions: [],
        engineOptions: [{ id: 1, label: 'Yanmar', instrumentHours: null }],
      },
    })

    expect(hoursInput(wrapper).value).toBe('')
  })

  test('ne devine pas le moteur sur un bateau à deux moteurs', () => {
    const wrapper = mount(NavigationLogCloseForm, {
      props: {
        boatId: 7,
        log,
        portOptions: [],
        engineOptions: [
          { id: 1, label: 'Bâbord', instrumentHours: 812 },
          { id: 2, label: 'Tribord', instrumentHours: 790 },
        ],
      },
    })

    expect(hoursInput(wrapper).value).toBe('')
  })

  test('propose les heures du moteur choisi quand il vient des instruments', async () => {
    const wrapper = mount(NavigationLogCloseForm, {
      props: {
        boatId: 7,
        log,
        portOptions: [],
        engineOptions: [
          { id: 1, label: 'Bâbord', instrumentHours: 812 },
          { id: 2, label: 'Tribord', instrumentHours: null },
        ],
      },
    })

    const select = wrapper.find('select[name="boatEngineId"]')
    await select.setValue('1')
    await nextTick()
    expect(hoursInput(wrapper).value).toBe('812')

    // Un moteur à saisie manuelle ne remplace pas ce qui est déjà tapé.
    await select.setValue('2')
    await nextTick()
    expect(hoursInput(wrapper).value).toBe('812')
  })
})
