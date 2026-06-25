import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useNetworkStatus } from '../../inertia/composables/use_network_status'

function mountComposable() {
  let result: ReturnType<typeof useNetworkStatus> | undefined

  const wrapper = mount(
    defineComponent({
      setup() {
        result = useNetworkStatus()
        return {}
      },
      template: '<div />',
    })
  )

  return { result: result!, wrapper }
}

describe('useNetworkStatus', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('isOnline reflects navigator.onLine on mount', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    })
    const { result } = mountComposable()
    expect(result.isOnline.value).toBe(true)
  })

  test('isOnline is false when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    })
    const { result } = mountComposable()
    expect(result.isOnline.value).toBe(false)
  })

  test('isOnline becomes false when offline event fires', () => {
    const { result } = mountComposable()
    expect(result.isOnline.value).toBe(true)

    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    })
    window.dispatchEvent(new Event('offline'))

    expect(result.isOnline.value).toBe(false)
  })

  test('isOnline becomes true when online event fires', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    })
    const { result } = mountComposable()
    expect(result.isOnline.value).toBe(false)

    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    })
    window.dispatchEvent(new Event('online'))

    expect(result.isOnline.value).toBe(true)
  })

  test('removes event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { wrapper } = mountComposable()
    wrapper.unmount()
    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function))
  })
})
