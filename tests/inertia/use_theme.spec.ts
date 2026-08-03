import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { defineComponent } from 'vue'

const routerPut = vi.fn()
const routerPost = vi.fn()
const pageProps: Record<string, unknown> = {}

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: pageProps }),
  router: {
    put: (...args: unknown[]) => routerPut(...args),
    post: (...args: unknown[]) => routerPost(...args),
  },
}))

const { useTheme } = await import('../../inertia/composables/use_theme')

/** Pilote `matchMedia` : le seul canal par lequel `system` est résolu. */
function stubMatchMedia(prefersDark: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = []
  const mql = {
    matches: prefersDark,
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.push(cb),
    removeEventListener: vi.fn(),
  }
  window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia
  return {
    emit(matches: boolean) {
      listeners.forEach((cb) => cb({ matches } as MediaQueryListEvent))
    },
  }
}

/** Monte un composant hôte : `useTheme` utilise onMounted/onBeforeUnmount. */
function mountWithTheme() {
  let api: ReturnType<typeof useTheme> | undefined
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useTheme()
        return () => null
      },
    })
  )
  return { wrapper, api: api! }
}

beforeEach(() => {
  routerPut.mockClear()
  routerPost.mockClear()
  for (const key of Object.keys(pageProps)) delete pageProps[key]
  document.documentElement.removeAttribute('data-theme')
})

describe('useTheme', () => {
  test('defaults to the `system` preference when the shared prop is missing', () => {
    stubMatchMedia(false)
    const { api } = mountWithTheme()
    expect(api.preference.value).toBe('system')
  })

  test('ignores an unknown preference value and falls back to `system`', () => {
    stubMatchMedia(false)
    pageProps.theme = 'sepia'
    const { api } = mountWithTheme()
    expect(api.preference.value).toBe('system')
  })

  test('resolves `system` to dark when the OS prefers dark', () => {
    stubMatchMedia(true)
    pageProps.theme = 'system'
    const { api } = mountWithTheme()
    expect(api.resolved.value).toBe('dark')
  })

  test('resolves `system` to light when the OS prefers light', () => {
    stubMatchMedia(false)
    pageProps.theme = 'system'
    const { api } = mountWithTheme()
    expect(api.resolved.value).toBe('light')
  })

  test('an explicit preference wins over the OS setting', () => {
    stubMatchMedia(true)
    pageProps.theme = 'light'
    const { api } = mountWithTheme()
    expect(api.resolved.value).toBe('light')
  })

  test('setTheme applies data-theme on <html> before the round-trip', () => {
    stubMatchMedia(false)
    pageProps.theme = 'system'
    const { api } = mountWithTheme()

    api.setTheme('dark')

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(api.resolved.value).toBe('dark')
  })

  test('setTheme("system") re-resolves through prefers-color-scheme', () => {
    stubMatchMedia(true)
    pageProps.theme = 'light'
    const { api } = mountWithTheme()

    api.setTheme('system')

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  test('persists on the authenticated route when a user is present', () => {
    stubMatchMedia(false)
    pageProps.theme = 'system'
    pageProps.user = { id: 1 }
    const { api } = mountWithTheme()

    api.setTheme('dark')

    expect(routerPut).toHaveBeenCalledWith(
      '/settings/theme',
      { theme: 'dark' },
      expect.objectContaining({ preserveScroll: true })
    )
    expect(routerPost).not.toHaveBeenCalled()
  })

  test('falls back to the public route when logged out', () => {
    stubMatchMedia(false)
    pageProps.theme = 'system'
    const { api } = mountWithTheme()

    api.setTheme('dark')

    expect(routerPost).toHaveBeenCalledWith(
      '/theme',
      { theme: 'dark' },
      expect.objectContaining({ preserveScroll: true })
    )
    expect(routerPut).not.toHaveBeenCalled()
  })

  test('does nothing when the preference is already the selected one', () => {
    stubMatchMedia(false)
    pageProps.theme = 'dark'
    const { api } = mountWithTheme()

    api.setTheme('dark')

    expect(routerPut).not.toHaveBeenCalled()
    expect(routerPost).not.toHaveBeenCalled()
  })

  test('follows a live OS change while the preference is `system`', () => {
    const media = stubMatchMedia(false)
    pageProps.theme = 'system'
    const { api } = mountWithTheme()

    media.emit(true)

    expect(api.resolved.value).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  test('ignores a live OS change when the theme is forced', () => {
    const media = stubMatchMedia(false)
    pageProps.theme = 'light'
    const { api } = mountWithTheme()

    media.emit(true)

    expect(api.resolved.value).toBe('light')
  })
})
