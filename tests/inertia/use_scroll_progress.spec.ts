import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { defineComponent } from 'vue'
import { useScrollProgress } from '../../inertia/composables/use_scroll_progress'

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

let ioCallback: ((entries: Array<{ isIntersecting: boolean }>) => void) | null = null

function stubIntersectionObserver() {
  ioCallback = null
  class MockIO {
    constructor(cb: (entries: Array<{ isIntersecting: boolean }>) => void) {
      ioCallback = cb
    }
    observe() {}
    disconnect() {}
  }
  vi.stubGlobal('IntersectionObserver', MockIO)
}

function mountProgress() {
  let result: ReturnType<typeof useScrollProgress> | undefined
  const wrapper = mount(
    defineComponent({
      setup() {
        result = useScrollProgress()
        // Function-ref : assigne l'élément au ref du composable avant onMounted.
        const setEl = (e: unknown) => {
          result!.el.value = (e as HTMLElement) ?? null
        }
        return { setEl }
      },
      template: '<div :ref="setEl" />',
    }),
    { attachTo: document.body }
  )
  return { result: result!, wrapper }
}

describe('useScrollProgress', () => {
  beforeEach(() => {
    stubIntersectionObserver()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('progress neutre (0.5) au départ', () => {
    stubReducedMotion(false)
    const { result } = mountProgress()
    expect(result.progress.value).toBe(0.5)
  })

  test('calcule le progress quand l’élément devient visible', () => {
    stubReducedMotion(false)
    const { result } = mountProgress()
    expect(ioCallback).not.toBeNull()
    ioCallback!([{ isIntersecting: true }])
    // rect vide (happy-dom) → (vh - 0) / (vh + 0) = 1
    expect(result.progress.value).toBe(1)
  })

  test('no-op sous prefers-reduced-motion (aucun observer, reste 0.5)', () => {
    stubReducedMotion(true)
    const { result } = mountProgress()
    expect(ioCallback).toBeNull()
    expect(result.progress.value).toBe(0.5)
  })
})
