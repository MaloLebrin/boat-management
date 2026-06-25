import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const useRegisterSWMock = vi.hoisted(() => vi.fn())

vi.mock('vue-sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('virtual:pwa-register/vue', () => ({
  useRegisterSW: useRegisterSWMock,
}))

vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return {
    ...actual,
    usePage: vi.fn(() => ({
      props: {
        appT: {
          'pwa.offlineReady': 'Application prête pour une utilisation hors-ligne',
        },
        locale: 'fr',
      },
    })),
  }
})

import { toast } from 'vue-sonner'
import { usePwaUpdate } from '../../inertia/composables/use_pwa_update'

function makeTestComponent() {
  return defineComponent({
    setup() {
      usePwaUpdate()
      return {}
    },
    template: '<div />',
  })
}

describe('usePwaUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('calls useRegisterSW with immediate: true', () => {
    useRegisterSWMock.mockReturnValue({ offlineReady: ref(false) })
    mount(makeTestComponent())
    expect(useRegisterSWMock).toHaveBeenCalledWith(expect.objectContaining({ immediate: true }))
  })

  test('shows success toast when offlineReady becomes true', async () => {
    const offlineReady = ref(false)
    useRegisterSWMock.mockReturnValue({ offlineReady })
    mount(makeTestComponent())

    offlineReady.value = true
    await nextTick()
    await flushPromises()

    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('prête'))
  })

  test('does not show toast when offlineReady stays false', async () => {
    useRegisterSWMock.mockReturnValue({ offlineReady: ref(false) })
    mount(makeTestComponent())
    await flushPromises()
    expect(toast.success).not.toHaveBeenCalled()
  })

  test('schedules periodic SW update check via onRegisteredSW', () => {
    vi.useFakeTimers()
    const updateMock = vi.fn().mockResolvedValue(undefined)
    useRegisterSWMock.mockImplementation(
      (options: { onRegisteredSW?: (url: string, reg: ServiceWorkerRegistration) => void }) => {
        options.onRegisteredSW?.('sw.js', {
          update: updateMock,
        } as unknown as ServiceWorkerRegistration)
        return { offlineReady: ref(false) }
      }
    )

    mount(makeTestComponent())
    vi.advanceTimersByTime(60 * 60 * 1000)
    expect(updateMock).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })

  test('onRegisteredSW does nothing when registration is undefined', () => {
    useRegisterSWMock.mockImplementation(
      (options: { onRegisteredSW?: (url: string, reg: undefined) => void }) => {
        options.onRegisteredSW?.('sw.js', undefined)
        return { offlineReady: ref(false) }
      }
    )
    expect(() => mount(makeTestComponent())).not.toThrow()
  })
})
