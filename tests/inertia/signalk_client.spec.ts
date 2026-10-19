import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  SIGNALK_HEARTBEAT_MS,
  SIGNALK_MAX_RETRY_MS,
  createSignalKClient,
  rebaseOnOrigin,
} from '../../inertia/lib/signalk/client'
import type {
  SignalKConnectionState,
  SignalKDelta,
  SignalKErrorKey,
  SignalKTransport,
  WebSocketLike,
} from '../../inertia/lib/signalk/types'

class FakeSocket implements WebSocketLike {
  readyState = 0
  onopen: ((event: unknown) => void) | null = null
  onmessage: ((event: { data: unknown }) => void) | null = null
  onclose: ((event: { code?: number }) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  sent: string[] = []
  closed = false

  constructor(readonly url: string) {}

  send(data: string) {
    this.sent.push(data)
  }
  close() {
    this.closed = true
    this.readyState = 3
  }
  // Côté « serveur »
  open() {
    this.readyState = 1
    this.onopen?.({})
  }
  message(body: unknown) {
    this.onmessage?.({ data: typeof body === 'string' ? body : JSON.stringify(body) })
  }
  drop() {
    this.readyState = 3
    this.onclose?.({ code: 1006 })
  }
}

const DISCOVERY = {
  endpoints: {
    v1: {
      'signalk-http': 'http://signalk.local:3000/signalk/v1/api/',
      'signalk-ws': 'ws://signalk.local:3000/signalk/v1/stream',
    },
  },
}

interface Setup {
  states: Array<[SignalKConnectionState, SignalKErrorKey | null]>
  deltas: SignalKDelta[]
  sockets: FakeSocket[]
  requests: Array<{ url: string; headers: Record<string, string> | undefined }>
  respond: { discovery: number | 'throw'; probe: number }
  client: ReturnType<typeof createSignalKClient>
}

function setup(options: { baseUrl?: string; token?: string | null } = {}): Setup {
  const ctx: Setup = {
    states: [],
    deltas: [],
    sockets: [],
    requests: [],
    respond: { discovery: 200, probe: 200 },
    client: undefined as never,
  }
  const transport: SignalKTransport = {
    fetch: async (url, init) => {
      ctx.requests.push({ url, headers: init?.headers })
      const isDiscovery = url.endsWith('/signalk')
      const status = isDiscovery ? ctx.respond.discovery : ctx.respond.probe
      if (status === 'throw') throw new TypeError('Failed to fetch')
      return { ok: status < 400, status, json: async () => (isDiscovery ? DISCOVERY : {}) }
    },
    createWebSocket: (url) => {
      const socket = new FakeSocket(url)
      ctx.sockets.push(socket)
      return socket
    },
  }
  ctx.client = createSignalKClient({
    baseUrl: options.baseUrl ?? 'https://signalk.local:3443',
    token: options.token === undefined ? 'secret-token' : options.token,
    context: 'vessels.self',
    transport,
    onDelta: (delta) => ctx.deltas.push(delta),
    onState: (state, key) => ctx.states.push([state, key]),
  })
  return ctx
}

const flush = () => vi.advanceTimersByTimeAsync(0)

describe('createSignalKClient (#989)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  test('rebaseOnOrigin garde le chemin découvert mais l’origine configurée', () => {
    expect(
      rebaseOnOrigin('ws://signalk.local:3000/signalk/v1/stream', 'https://sk.example:3443', true)
    ).toBe('wss://sk.example:3443/signalk/v1/stream')
    expect(rebaseOnOrigin('http://x:3000/signalk/v1/api/', 'http://192.168.1.5:3000', false)).toBe(
      'http://192.168.1.5:3000/signalk/v1/api/'
    )
  })

  test('découverte, sonde, WebSocket sans abonnement puis abonnement à l’ouverture', async () => {
    const ctx = setup()
    ctx.client.connect()
    await flush()

    expect(ctx.requests.map((r) => r.url)).toEqual([
      'https://signalk.local:3443/signalk',
      'https://signalk.local:3443/signalk/v1/api/vessels/self',
    ])
    expect(ctx.requests[0].headers).toEqual({ Authorization: 'Bearer secret-token' })
    // Jeton en query pour le WebSocket (pas d'en-tête possible côté navigateur).
    expect(ctx.sockets[0].url).toBe(
      'wss://signalk.local:3443/signalk/v1/stream?subscribe=none&token=secret-token'
    )

    ctx.sockets[0].open()
    const message = JSON.parse(ctx.sockets[0].sent[0])
    expect(message.context).toBe('vessels.self')
    expect(message.subscribe.length).toBeGreaterThan(10)
    expect(message.subscribe[0]).toMatchObject({
      path: expect.any(String),
      policy: expect.any(String),
    })
    expect(ctx.states.map(([state]) => state)).toEqual(['connecting', 'open'])
  })

  test('sans jeton : ni en-tête ni paramètre', async () => {
    const ctx = setup({ token: null })
    ctx.client.connect()
    await flush()
    expect(ctx.requests[0].headers).toEqual({})
    expect(ctx.sockets[0].url).toBe('wss://signalk.local:3443/signalk/v1/stream?subscribe=none')
  })

  test('relaie les deltas et retient le self du hello', async () => {
    const ctx = setup()
    ctx.client.connect()
    await flush()
    ctx.sockets[0].open()

    ctx.sockets[0].message({ name: 'signalk-server', self: 'vessels.urn:mrn:imo:mmsi:1' })
    ctx.sockets[0].message('pas du json')
    ctx.sockets[0].message({ context: 'vessels.self', updates: [{ values: [] }] })

    expect(ctx.deltas).toHaveLength(1)
  })

  test('401 : « jeton requis », sans WebSocket ni boucle de reconnexion', async () => {
    const ctx = setup()
    ctx.respond.probe = 401
    ctx.client.connect()
    await flush()
    await vi.advanceTimersByTimeAsync(120_000)

    expect(ctx.sockets).toHaveLength(0)
    expect(ctx.states.at(-1)).toEqual(['error', 'unauthorized'])
    expect(ctx.requests).toHaveLength(2)
  })

  test('401 dès la découverte : même issue', async () => {
    const ctx = setup()
    ctx.respond.discovery = 401
    ctx.client.connect()
    await flush()
    expect(ctx.states.at(-1)).toEqual(['error', 'unauthorized'])
  })

  test('hôte injoignable : reconnexion avec repli exponentiel plafonné à 30 s', async () => {
    const ctx = setup({ baseUrl: 'http://192.168.1.5:3000' })
    ctx.respond.discovery = 'throw'
    ctx.client.connect()
    await flush()
    expect(ctx.states.at(-1)).toEqual(['reconnecting', 'unreachable'])

    const delays: number[] = []
    for (let attempt = 0; attempt < 7; attempt++) {
      const before = ctx.requests.length
      let waited = 0
      while (ctx.requests.length === before && waited < 120_000) {
        await vi.advanceTimersByTimeAsync(500)
        waited += 500
      }
      delays.push(waited)
    }
    expect(delays[0]).toBeLessThanOrEqual(2_500)
    expect(Math.max(...delays)).toBeLessThanOrEqual(SIGNALK_MAX_RETRY_MS + 500)
    expect(delays.at(-1)).toBeGreaterThanOrEqual(SIGNALK_MAX_RETRY_MS - 500)
  })

  test('serveur https injoignable : piste TLS', async () => {
    const ctx = setup()
    ctx.respond.discovery = 'throw'
    ctx.client.connect()
    await flush()
    expect(ctx.states.at(-1)).toEqual(['reconnecting', 'tls'])
  })

  test('fermeture du flux : reconnexion puis nouveau WebSocket', async () => {
    const ctx = setup()
    ctx.client.connect()
    await flush()
    ctx.sockets[0].open()

    ctx.sockets[0].drop()
    expect(ctx.states.at(-1)).toEqual(['reconnecting', null])
    await vi.advanceTimersByTimeAsync(2_000)

    expect(ctx.sockets).toHaveLength(2)
    ctx.sockets[1].open()
    expect(ctx.states.at(-1)).toEqual(['open', null])
  })

  test('heartbeat : un flux muet est refermé et relancé', async () => {
    const ctx = setup()
    ctx.client.connect()
    await flush()
    ctx.sockets[0].open()

    await vi.advanceTimersByTimeAsync(SIGNALK_HEARTBEAT_MS + 6_000)

    expect(ctx.sockets[0].closed).toBe(true)
    expect(ctx.states.at(-1)?.[0]).toBe('reconnecting')
  })

  test('disconnect ferme tout et empêche toute relance', async () => {
    const ctx = setup()
    ctx.client.connect()
    await flush()
    ctx.sockets[0].open()

    ctx.client.disconnect()
    await vi.advanceTimersByTimeAsync(120_000)

    expect(ctx.sockets[0].closed).toBe(true)
    expect(ctx.sockets).toHaveLength(1)
    expect(ctx.states.at(-1)).toEqual(['closed', null])
  })

  test('une découverte sans endpoints est une erreur de protocole', async () => {
    const ctx = setup()
    const original = ctx.client
    expect(original).toBeDefined()
    const bad = createSignalKClient({
      baseUrl: 'https://x',
      token: null,
      context: 'vessels.self',
      transport: {
        fetch: async () => ({ ok: true, status: 200, json: async () => ({ hello: 'world' }) }),
        createWebSocket: () => new FakeSocket('x'),
      },
      onDelta: () => {},
      onState: (state, key) => ctx.states.push([state, key]),
    })
    bad.connect()
    await flush()
    expect(ctx.states.at(-1)).toEqual(['error', 'protocol'])
  })
})
