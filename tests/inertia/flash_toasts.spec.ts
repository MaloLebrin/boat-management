import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Toaster, toast } from 'vue-sonner'
import {
  FLASH_TOAST_MAX_LIFETIME_MS,
  useFlashToasts,
} from '../../inertia/composables/use_flash_toasts'

type Flash = { success?: string; error?: string; info?: string; errorAction?: string }

const s = vi.hoisted(() => ({
  page: undefined as unknown as {
    url: string
    props: { flash: Flash; appT: Record<string, string> }
  },
  visit: vi.fn(),
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => s.page,
  router: { visit: s.visit },
}))

const Host = defineComponent({
  setup(_, { expose }) {
    const { dismissAll } = useFlashToasts()
    expose({ dismissAll })
    return () => h(Toaster, { position: 'top-center' })
  },
})

function mountHost(flash: Flash = {}) {
  s.page = reactive({
    url: '/boats/1',
    props: {
      flash,
      appT: { 'common.viewPlans': 'View plans' },
    },
  })
  return mount(Host, { attachTo: document.body })
}

// Le `ToastState` de vue-sonner est un singleton de module : un `<Toaster>`
// laissé monté par un test précédent réagit aux toasts des tests suivants et
// fausse leurs minuteurs.
enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.useFakeTimers()
  s.visit.mockClear()
  toast.dismiss()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useFlashToasts', () => {
  test('renders a toast for each flash type', async () => {
    const w = mountHost({ success: 'Task done.', error: 'Boom.', info: 'Heads up.' })
    await vi.advanceTimersByTimeAsync(100)

    expect(w.text()).toContain('Task done.')
    expect(w.text()).toContain('Boom.')
    expect(w.text()).toContain('Heads up.')
  })

  test('reacts to a flash arriving on a later Inertia visit', async () => {
    const w = mountHost()
    await vi.advanceTimersByTimeAsync(100)
    expect(w.text()).not.toContain('Task done.')

    s.page.props.flash = { success: 'Task done.' }
    await nextTick()
    await vi.advanceTimersByTimeAsync(100)

    expect(w.text()).toContain('Task done.')
  })

  test('auto-dismisses a success toast nobody touches', async () => {
    const w = mountHost({ success: 'Task done.' })
    await vi.advanceTimersByTimeAsync(100)
    expect(w.text()).toContain('Task done.')

    await vi.advanceTimersByTimeAsync(FLASH_TOAST_MAX_LIFETIME_MS)

    expect(w.text()).not.toContain('Task done.')
  })

  // Régression #467 : vue-sonner met son minuteur en pause tant que le toaster
  // est survolé, et le toast de succès restait affiché > 45 s.
  test('dismisses a hovered success toast once the max lifetime is reached', async () => {
    const w = mountHost({ success: 'Task done.' })
    await vi.advanceTimersByTimeAsync(100)

    await w.find('[data-sonner-toaster]').trigger('mouseenter')
    await vi.advanceTimersByTimeAsync(FLASH_TOAST_MAX_LIFETIME_MS - 1_000)
    expect(w.text(), 'still readable before the cap').toContain('Task done.')

    await vi.advanceTimersByTimeAsync(2_000)

    expect(w.text()).not.toContain('Task done.')
  })

  test('dismisses a hovered error toast once the max lifetime is reached', async () => {
    const w = mountHost({ error: 'Boom.' })
    await vi.advanceTimersByTimeAsync(100)

    await w.find('[data-sonner-toaster]').trigger('mouseenter')
    await vi.advanceTimersByTimeAsync(FLASH_TOAST_MAX_LIFETIME_MS + 1_000)

    expect(w.text()).not.toContain('Boom.')
  })

  test('an error flash carrying errorAction gets a CTA that visits the target', async () => {
    const w = mountHost({ error: 'Quota reached.', errorAction: '/settings/billing' })
    await vi.advanceTimersByTimeAsync(100)

    const cta = w.findAll('button').find((b) => b.text() === 'View plans')
    expect(cta).toBeDefined()

    await cta!.trigger('click')
    expect(s.visit).toHaveBeenCalledWith('/settings/billing')
  })

  test('an error flash without errorAction gets no CTA', async () => {
    const w = mountHost({ error: 'Boom.' })
    await vi.advanceTimersByTimeAsync(100)

    expect(w.findAll('button').some((b) => b.text() === 'View plans')).toBe(false)
  })

  test('dismissAll clears visible toasts', async () => {
    const w = mountHost({ success: 'Task done.' })
    await vi.advanceTimersByTimeAsync(100)
    expect(w.text()).toContain('Task done.')
    ;(w.vm as unknown as { dismissAll: () => void }).dismissAll()
    await vi.advanceTimersByTimeAsync(1_000)

    expect(w.text()).not.toContain('Task done.')
  })

  test('dismissAll cancels the pending safety timer', async () => {
    const w = mountHost({ success: 'Task done.' })
    await vi.advanceTimersByTimeAsync(100)
    ;(w.vm as unknown as { dismissAll: () => void }).dismissAll()
    const dismissSpy = vi.spyOn(toast, 'dismiss')
    await vi.advanceTimersByTimeAsync(FLASH_TOAST_MAX_LIFETIME_MS * 2)

    expect(dismissSpy).not.toHaveBeenCalled()
    dismissSpy.mockRestore()
  })

  test('unmounting cancels pending safety timers', async () => {
    const w = mountHost({ success: 'Task done.' })
    await vi.advanceTimersByTimeAsync(100)

    w.unmount()
    await nextTick()
    const dismissSpy = vi.spyOn(toast, 'dismiss')
    await vi.advanceTimersByTimeAsync(FLASH_TOAST_MAX_LIFETIME_MS * 2)

    expect(dismissSpy).not.toHaveBeenCalled()
    dismissSpy.mockRestore()
  })
})
