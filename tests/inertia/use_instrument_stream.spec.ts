import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useInstrumentStream } from '../../inertia/composables/use_instrument_stream'
import type { SignalKTransport, WebSocketLike } from '../../inertia/lib/signalk/types'

class FakeSocket implements WebSocketLike {
  readyState = 0
  onopen: ((event: unknown) => void) | null = null
  onmessage: ((event: { data: unknown }) => void) | null = null
  onclose: ((event: { code?: number }) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  closed = false
  constructor(readonly url: string) {}
  send() {}
  close() {
    this.closed = true
  }
  open() {
    this.readyState = 1
    this.onopen?.({})
  }
  message(body: unknown) {
    this.onmessage?.({ data: JSON.stringify(body) })
  }
}

const source = {
  baseUrl: 'https://sk.local:3443',
  token: 'tok',
  vesselContext: 'vessels.self',
  enabled: true,
}

function makeTransport() {
  const sockets: FakeSocket[] = []
  const transport: SignalKTransport = {
    fetch: async (url) => ({
      ok: true,
      status: 200,
      json: async () =>
        url.endsWith('/signalk')
          ? {
              endpoints: {
                v1: {
                  'signalk-http': 'https://sk.local:3443/signalk/v1/api/',
                  'signalk-ws': 'wss://sk.local:3443/signalk/v1/stream',
                },
              },
            }
          : {},
    }),
    createWebSocket: (url) => {
      const socket = new FakeSocket(url)
      sockets.push(socket)
      return socket
    },
  }
  return { transport, sockets }
}

function mountStream(overrides: Partial<Parameters<typeof useInstrumentStream>[0]> = {}) {
  let stream!: ReturnType<typeof useInstrumentStream>
  const wrapper = mount(
    defineComponent({
      setup() {
        stream = useInstrumentStream({ source: () => source, ...overrides })
        return {}
      },
      template: '<div />',
    })
  )
  return { stream, wrapper }
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useInstrumentStream (#989)', () => {
  const release = vi.fn().mockResolvedValue(undefined)
  const request = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    release.mockClear()
    request.mockReset().mockResolvedValue({ release })
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })
    setVisibility('visible')
  })
  afterEach(() => vi.useRealTimers())

  test('démarre le flux, garde les dernières valeurs et alimente la synchro', async () => {
    const { transport, sockets } = makeTransport()
    const onSamples = vi.fn()
    const { stream } = mountStream({ transport, onSamples })

    stream.start()
    await vi.advanceTimersByTimeAsync(0)
    sockets[0].open()
    sockets[0].message({
      context: 'vessels.self',
      updates: [
        {
          timestamp: '2026-10-19T08:00:00Z',
          values: [
            { path: 'navigation.speedOverGround', value: 3.5 },
            { path: 'design.length', value: 12 },
          ],
        },
      ],
    })

    expect(stream.connectionState.value).toBe('open')
    expect(stream.latestByPath.value['navigation.speedOverGround'].value).toBe(3.5)
    expect(stream.latestByPath.value).not.toHaveProperty('design.length')
    expect(stream.lastDeltaAt.value).not.toBeNull()
    expect(onSamples).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith('screen')
  })

  test('une valeur devient périmée après staleAfterS', async () => {
    const { transport, sockets } = makeTransport()
    const { stream } = mountStream({ transport, staleAfterS: 30 })
    stream.start()
    await vi.advanceTimersByTimeAsync(0)
    sockets[0].open()
    sockets[0].message({
      context: 'vessels.self',
      updates: [{ values: [{ path: 'environment.depth.belowKeel', value: 4 }] }],
    })
    expect(stream.staleSince.value['environment.depth.belowKeel']).toBe(false)

    await vi.advanceTimersByTimeAsync(31_000)
    expect(stream.staleSince.value['environment.depth.belowKeel']).toBe(true)
  })

  test('page masquée : flux coupé et Wake Lock relâché ; retour : flux rouvert', async () => {
    const { transport, sockets } = makeTransport()
    const { stream } = mountStream({ transport })
    stream.start()
    await vi.advanceTimersByTimeAsync(0)
    sockets[0].open()

    setVisibility('hidden')
    expect(sockets[0].closed).toBe(true)
    expect(release).toHaveBeenCalled()

    setVisibility('visible')
    await vi.advanceTimersByTimeAsync(0)
    expect(sockets).toHaveLength(2)
  })

  test('source désactivée ou absente : rien ne se connecte', async () => {
    const { transport, sockets } = makeTransport()
    mountStream({ transport, source: () => ({ ...source, enabled: false }) }).stream.start()
    mountStream({ transport, source: () => null }).stream.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(sockets).toHaveLength(0)
  })

  test('Wake Lock refusé : le flux marche quand même', async () => {
    request.mockRejectedValue(new Error('NotAllowedError'))
    const { transport, sockets } = makeTransport()
    const { stream } = mountStream({ transport })
    stream.start()
    await vi.advanceTimersByTimeAsync(0)
    sockets[0].open()
    expect(stream.connectionState.value).toBe('open')
  })

  test('démonter coupe le flux', async () => {
    const { transport, sockets } = makeTransport()
    const { stream, wrapper } = mountStream({ transport })
    stream.start()
    await vi.advanceTimersByTimeAsync(0)
    sockets[0].open()

    wrapper.unmount()

    expect(sockets[0].closed).toBe(true)
  })
})
