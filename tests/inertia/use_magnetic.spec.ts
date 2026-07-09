import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { defineComponent } from 'vue'
import { useMagnetic } from '../../inertia/composables/use_magnetic'

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

function mountMagnetic() {
  let result: ReturnType<typeof useMagnetic> | undefined
  const wrapper = mount(
    defineComponent({
      setup() {
        result = useMagnetic({ strength: 0.5, max: 12 })
        // Function-ref : assigne l'élément au ref du composable avant onMounted
        // (un `:ref="el"` sur template inline runtime déballerait le ref).
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

describe('useMagnetic', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('suit le curseur au survol puis se réinitialise', async () => {
    stubReducedMotion(false)
    const { result, wrapper } = mountMagnetic()
    const el = result.el.value as HTMLElement

    el.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }))
    expect(result.transform.value).not.toBe('')
    expect(result.transform.value).toContain('translate(')

    el.dispatchEvent(new MouseEvent('mouseleave'))
    expect(result.transform.value).toBe('translate(0px, 0px)')

    wrapper.unmount()
  })

  test('le décalage est borné par `max`', () => {
    stubReducedMotion(false)
    const { result } = mountMagnetic()
    const el = result.el.value as HTMLElement

    // clientX énorme → décalage clampé à ±max (12px)
    el.dispatchEvent(new MouseEvent('mousemove', { clientX: 9999, clientY: 0 }))
    expect(result.transform.value).toBe('translate(12.0px, 0.0px)')
  })

  test('no-op sous prefers-reduced-motion', () => {
    stubReducedMotion(true)
    const { result } = mountMagnetic()
    const el = result.el.value as HTMLElement

    el.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }))
    expect(result.transform.value).toBe('')
  })
})
