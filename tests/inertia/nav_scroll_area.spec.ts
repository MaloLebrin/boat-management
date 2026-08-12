import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

import NavScrollArea from '../../inertia/components/layout/NavScrollArea.vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

/**
 * happy-dom ne calcule aucune métrique de layout : on simule le débordement en
 * fixant scrollHeight / clientHeight / scrollTop sur le conteneur scrollable.
 */
function mountArea(metrics: { scrollHeight: number; clientHeight: number; scrollTop?: number }) {
  const w = mount(NavScrollArea, {
    slots: { default: '<a href="/reservations">Réservations</a>' },
    attachTo: document.body,
  })
  const nav = w.find('nav').element as HTMLElement
  Object.defineProperty(nav, 'scrollHeight', { value: metrics.scrollHeight, configurable: true })
  Object.defineProperty(nav, 'clientHeight', { value: metrics.clientHeight, configurable: true })
  Object.defineProperty(nav, 'scrollTop', {
    value: metrics.scrollTop ?? 0,
    writable: true,
    configurable: true,
  })
  nav.scrollBy = vi.fn()
  return { w, nav }
}

async function refresh(w: ReturnType<typeof mount>, nav: HTMLElement) {
  nav.dispatchEvent(new Event('scroll'))
  await w.vm.$nextTick()
}

describe('NavScrollArea', () => {
  test('renders the slotted navigation entries', () => {
    const { w } = mountArea({ scrollHeight: 100, clientHeight: 100 })
    wrapper = w
    expect(w.text()).toContain('Réservations')
  })

  test('shows no indicator when everything fits', async () => {
    const { w, nav } = mountArea({ scrollHeight: 360, clientHeight: 360 })
    wrapper = w
    await refresh(w, nav)

    expect(w.find('[data-testid="nav-scroll-fade-top"]').isVisible()).toBe(false)
    expect(w.find('[data-testid="nav-scroll-fade-bottom"]').isVisible()).toBe(false)
    expect(w.find('[data-testid="nav-scroll-down"]').isVisible()).toBe(false)
  })

  test('signals hidden entries below the fold — cas #462 (360 px visibles / 648 px)', async () => {
    const { w, nav } = mountArea({ scrollHeight: 648, clientHeight: 360 })
    wrapper = w
    await refresh(w, nav)

    expect(w.find('[data-testid="nav-scroll-fade-bottom"]').isVisible()).toBe(true)
    expect(w.find('[data-testid="nav-scroll-down"]').isVisible()).toBe(true)
    expect(w.find('[data-testid="nav-scroll-fade-top"]').isVisible()).toBe(false)
  })

  test('signals both directions mid-scroll', async () => {
    const { w, nav } = mountArea({ scrollHeight: 648, clientHeight: 360 })
    wrapper = w
    nav.scrollTop = 100
    await refresh(w, nav)

    expect(w.find('[data-testid="nav-scroll-fade-top"]').isVisible()).toBe(true)
    expect(w.find('[data-testid="nav-scroll-fade-bottom"]').isVisible()).toBe(true)
  })

  test('drops the bottom indicator once scrolled to the end', async () => {
    const { w, nav } = mountArea({ scrollHeight: 648, clientHeight: 360 })
    wrapper = w
    nav.scrollTop = 288
    await refresh(w, nav)

    expect(w.find('[data-testid="nav-scroll-fade-bottom"]').isVisible()).toBe(false)
    expect(w.find('[data-testid="nav-scroll-down"]').isVisible()).toBe(false)
    expect(w.find('[data-testid="nav-scroll-fade-top"]').isVisible()).toBe(true)
  })

  test('clicking the indicator scrolls the navigation down', async () => {
    const { w, nav } = mountArea({ scrollHeight: 648, clientHeight: 360 })
    wrapper = w
    await refresh(w, nav)

    await w.find('[data-testid="nav-scroll-down"]').trigger('click')

    expect(nav.scrollBy).toHaveBeenCalledWith({ top: 288, behavior: 'smooth' })
  })

  test('scrolls without animation under prefers-reduced-motion', async () => {
    const matchMedia = vi
      .spyOn(window, 'matchMedia')
      .mockReturnValue({ matches: true } as MediaQueryList)
    const { w, nav } = mountArea({ scrollHeight: 648, clientHeight: 360 })
    wrapper = w
    await refresh(w, nav)

    await w.find('[data-testid="nav-scroll-down"]').trigger('click')

    expect(nav.scrollBy).toHaveBeenCalledWith({ top: 288, behavior: 'auto' })
    matchMedia.mockRestore()
  })

  test('re-evaluates the overflow when the window is resized', async () => {
    const { w, nav } = mountArea({ scrollHeight: 360, clientHeight: 360 })
    wrapper = w
    await refresh(w, nav)
    expect(w.find('[data-testid="nav-scroll-fade-bottom"]').isVisible()).toBe(false)

    // Fenêtre raccourcie : le contenu ne tient plus, l'indicateur doit apparaître.
    Object.defineProperty(nav, 'clientHeight', { value: 200, configurable: true })
    window.dispatchEvent(new Event('resize'))
    await w.vm.$nextTick()

    expect(w.find('[data-testid="nav-scroll-fade-bottom"]').isVisible()).toBe(true)
  })

  test('the indicator button is labelled for assistive technologies', () => {
    const { w } = mountArea({ scrollHeight: 648, clientHeight: 360 })
    wrapper = w
    expect(w.find('[data-testid="nav-scroll-down"]').attributes('aria-label')).toBe(
      'nav.scrollDown'
    )
  })
})
