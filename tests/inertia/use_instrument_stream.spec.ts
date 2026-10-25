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
  sent: string[] = []
  constructor(readonly url: string) {}
  send(data: string) {
    this.sent.push(data)
  }
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

  test('évalue les règles à chaque delta : ouvre, maintient puis lève l’alerte à bord (#993)', async () => {
    const { transport, sockets } = makeTransport()
    const rule = {
      key: 'builtin:shallow_water',
      pathPattern: 'environment.depth.belowKeel',
      kind: 'threshold' as const,
      operator: 'lt' as const,
      threshold: 1.5,
      hysteresis: 0.5,
      severity: 'critical' as const,
    }
    const { stream } = mountStream({ transport, alertRules: () => [rule] })
    stream.start()
    await vi.advanceTimersByTimeAsync(0)
    sockets[0].open()
    const depth = (value: number) =>
      sockets[0].message({
        context: 'vessels.self',
        updates: [{ values: [{ path: 'environment.depth.belowKeel', value }] }],
      })
    const key = 'builtin:shallow_water|environment.depth.belowKeel'

    depth(3)
    expect(Object.keys(stream.localAlerts.value)).toEqual([])

    depth(1)
    expect(stream.localAlerts.value[key]).toMatchObject({ severity: 'critical', value: 1 })
    const openedAt = stream.localAlerts.value[key].openedAt

    await vi.advanceTimersByTimeAsync(1000)
    depth(1.8) // dans la marge : maintenue, même instant d'ouverture
    expect(stream.localAlerts.value[key].openedAt).toBe(openedAt)
    expect(stream.localAlerts.value[key].value).toBe(1.8)

    depth(2.2)
    expect(stream.localAlerts.value).toEqual({})
  })

  test('sans règle, aucune alerte locale', async () => {
    const { transport, sockets } = makeTransport()
    const { stream } = mountStream({ transport })
    stream.start()
    await vi.advanceTimersByTimeAsync(0)
    sockets[0].open()
    sockets[0].message({
      context: 'vessels.self',
      updates: [{ values: [{ path: 'environment.depth.belowKeel', value: 0.1 }] }],
    })
    expect(stream.localAlerts.value).toEqual({})
  })

  test('AIS (#1009) : abonnement vessels.* et deltas des cibles transmis sans polluer les mesures', async () => {
    const { transport, sockets } = makeTransport()
    const onAisDelta = vi.fn()
    const onSamples = vi.fn()
    const { stream } = mountStream({ transport, onAisDelta, onSamples })

    stream.start()
    await vi.advanceTimersByTimeAsync(0)
    sockets[0].open()
    expect(sockets[0].sent.map((raw) => JSON.parse(raw).context)).toEqual([
      'vessels.self',
      'vessels.*',
    ])

    sockets[0].message({
      context: 'vessels.urn:mrn:imo:mmsi:244630000',
      updates: [
        { values: [{ path: 'navigation.position', value: { latitude: 43, longitude: 5 } }] },
      ],
    })
    expect(onAisDelta).toHaveBeenCalledTimes(1)
    expect(onSamples).not.toHaveBeenCalled()
    expect(stream.latestByPath.value).toEqual({})
  })

  test('sans onAisDelta, un seul abonnement (pas d’AIS)', async () => {
    const { transport, sockets } = makeTransport()
    const { stream } = mountStream({ transport })
    stream.start()
    await vi.advanceTimersByTimeAsync(0)
    sockets[0].open()
    expect(sockets[0].sent).toHaveLength(1)
  })
})
