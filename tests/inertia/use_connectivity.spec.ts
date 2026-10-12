import { flushPromises, enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// #953 — connectivité réelle : `navigator.onLine` + probe `HEAD /up`.

type Mod = typeof import('../../inertia/composables/use_connectivity')
let mod: Mod

enableAutoUnmount(afterEach)
const fetchMock = vi.fn()

function setNavigatorOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, writable: true, configurable: true })
}

function setVisibility(value: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value, configurable: true })
}

function mountMonitor() {
  let result: ReturnType<Mod['useConnectivity']> | undefined
  const wrapper = mount(
    defineComponent({
      setup() {
        result = mod.useConnectivity()
        return {}
      },
      template: '<div />',
    })
  )
  return { result: result!, wrapper }
}

const ok = () => Promise.resolve(new Response(null, { status: 200 }))

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  setNavigatorOnline(true)
  setVisibility('visible')
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.resetModules()
  mod = await import('../../inertia/composables/use_connectivity')
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useConnectivity', () => {
  test('probe HEAD /up au montage ; 2xx → online, compteur incrémenté', async () => {
    fetchMock.mockImplementation(ok)
    const { result } = mountMonitor()
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith(
      '/up',
      expect.objectContaining({ method: 'HEAD', cache: 'no-store' })
    )
    expect(result.state.value).toBe('online')
    expect(result.reachableCount.value).toBe(1)
  })

  test('erreur réseau → degraded, sans incrémenter le compteur', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const { result } = mountMonitor()
    await flushPromises()

    expect(result.state.value).toBe('degraded')
    expect(result.reachableCount.value).toBe(0)
  })

  test('503 → degraded', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }))
    const { result } = mountMonitor()
    await flushPromises()

    expect(result.state.value).toBe('degraded')
  })

  test('timeout de 5 s → la probe est annulée, degraded', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal!.addEventListener('abort', () => reject(new DOMException('', 'AbortError')))
        })
    )
    const { result } = mountMonitor()

    await vi.advanceTimersByTimeAsync(mod.PROBE_TIMEOUT_MS)
    await flushPromises()

    expect(result.state.value).toBe('degraded')
  })

  test('navigateur hors-ligne → offline, aucune probe', async () => {
    setNavigatorOnline(false)
    const { result } = mountMonitor()
    await flushPromises()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.state.value).toBe('offline')
  })

  test('intervalle adaptatif : 30 s en dégradé, 5 min en ligne', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const { result } = mountMonitor()
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    fetchMock.mockImplementation(ok)
    await vi.advanceTimersByTimeAsync(mod.PROBE_INTERVAL_DEGRADED_MS - 1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.state.value).toBe('online')

    await vi.advanceTimersByTimeAsync(mod.PROBE_INTERVAL_DEGRADED_MS)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(mod.PROBE_INTERVAL_ONLINE_MS)
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  test("l'événement online ne passe pas en ligne avant la probe", async () => {
    setNavigatorOnline(false)
    const { result } = mountMonitor()
    await flushPromises()

    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    setNavigatorOnline(true)
    window.dispatchEvent(new Event('online'))
    expect(result.state.value).toBe('offline')
    await flushPromises()

    // Wi-Fi de bord associé, WAN mort : pas d'« online ».
    expect(result.state.value).toBe('degraded')
    expect(result.reachableCount.value).toBe(0)
  })

  test("l'événement offline coupe la probe programmée", async () => {
    fetchMock.mockImplementation(ok)
    const { result } = mountMonitor()
    await flushPromises()

    setNavigatorOnline(false)
    window.dispatchEvent(new Event('offline'))
    expect(result.state.value).toBe('offline')

    await vi.advanceTimersByTimeAsync(mod.PROBE_INTERVAL_ONLINE_MS * 2)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('arrière-plan : pause des probes, reprise immédiate au retour', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    mountMonitor()
    await flushPromises()

    setVisibility('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(mod.PROBE_INTERVAL_DEGRADED_MS * 3)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    setVisibility('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test('démontage : plus de probe ni d’écoute', async () => {
    fetchMock.mockImplementation(ok)
    const { wrapper } = mountMonitor()
    await flushPromises()
    wrapper.unmount()

    await vi.advanceTimersByTimeAsync(mod.PROBE_INTERVAL_ONLINE_MS * 2)
    window.dispatchEvent(new Event('online'))
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('une seule probe en vol à la fois', async () => {
    fetchMock.mockImplementation(ok)
    mountMonitor()
    void mod.probeConnectivity()
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
