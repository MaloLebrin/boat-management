import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { defineComponent } from 'vue'
import { useClipboard } from '../../inertia/composables/use_clipboard'

/** Presse-papiers partagé (#1018). */

function mountWith(options?: { resetAfterMs?: number }) {
  let api!: ReturnType<typeof useClipboard>
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useClipboard(options)
        return () => null
      },
    })
  )
  return { api, wrapper }
}

describe('useClipboard', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  test('copies the text, flags copied, then resets after 2 s', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const { api } = mountWith()
    expect(api.supported.value).toBe(true)

    expect(await api.copy('hello')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('hello')
    expect(api.copied.value).toBe(true)

    vi.advanceTimersByTime(1999)
    expect(api.copied.value).toBe(true)
    vi.advanceTimersByTime(1)
    expect(api.copied.value).toBe(false)
  })

  test('honours a custom reset delay and restarts the timer on a second copy', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
    const { api } = mountWith({ resetAfterMs: 500 })
    await api.copy('a')
    vi.advanceTimersByTime(400)
    await api.copy('b')
    vi.advanceTimersByTime(400)
    expect(api.copied.value).toBe(true)
    vi.advanceTimersByTime(100)
    expect(api.copied.value).toBe(false)
  })

  test('returns false without throwing when the browser refuses', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    const { api } = mountWith()
    expect(await api.copy('x')).toBe(false)
    expect(api.copied.value).toBe(false)
  })

  test('reports unsupported when navigator.clipboard is missing', async () => {
    vi.stubGlobal('navigator', {})
    const { api } = mountWith()
    expect(api.supported.value).toBe(false)
    expect(await api.copy('x')).toBe(false)
    expect(api.copied.value).toBe(false)
  })

  test('clears the timer on unmount', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
    const { api, wrapper } = mountWith()
    await api.copy('x')
    expect(vi.getTimerCount()).toBe(1)
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
