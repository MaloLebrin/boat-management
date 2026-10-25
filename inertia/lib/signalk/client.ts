import { AIS_SUBSCRIBE_CONTEXT } from '#shared/constants/ais'
import { retryDelayMs } from '#shared/helpers/offline_retry'
import { subscriptionSpecs } from './path_catalog'
import type {
  SignalKConnectionState,
  SignalKDelta,
  SignalKDiscovery,
  SignalKErrorKey,
  SignalKTransport,
  SubscriptionSpec,
  WebSocketLike,
} from './types'

/**
 * Client Signal K (#989) : découverte REST, sonde d'authentification, flux
 * WebSocket, reconnexion. Pur — `fetch` et `WebSocket` sont injectés.
 *
 * Enseignements du spike (#985) mesurés sur `signalk-server` :
 * - un serveur en `--securityenabled` sans compte admin répond 401 en REST,
 *   **ouvre quand même le WebSocket puis n'émet aucun delta** : on sonde le
 *   REST d'abord et on s'arrête sur `unauthorized` au lieu de boucler ;
 * - la découverte renvoie des URL en `http://`/`ws://` : on garde le chemin
 *   mais on reprend l'**origine configurée** (sinon contenu mixte en HTTPS) ;
 * - sans delta pendant 20 s, le flux est mort : on le referme et on relance ;
 * - redémarrage du serveur : reprise en ~13 s, repli plafonné à 30 s.
 */

export const SIGNALK_HEARTBEAT_MS = 20_000
export const SIGNALK_MAX_RETRY_MS = 30_000

const WS_OPEN = 1

export interface SignalKClientOptions {
  baseUrl: string
  token: string | null
  /** Contexte lu (`vessels.self`). */
  context: string
  /** Abonnements ; par défaut ceux du catalogue. */
  subscriptions?: SubscriptionSpec[]
  /** Abonnements aux autres navires (`vessels.*`, AIS #1009) ; absent = pas d'AIS. */
  aisSubscriptions?: SubscriptionSpec[]
  onDelta: (delta: SignalKDelta, self: string | null) => void
  onState: (state: SignalKConnectionState, errorKey: SignalKErrorKey | null) => void
  transport: SignalKTransport
  heartbeatMs?: number
}

interface DiscoveryBody {
  endpoints?: Record<string, Record<string, unknown> | undefined>
}

/** Reprend le chemin d'une URL découverte mais l'origine (et le schéma) configurés. */
export function rebaseOnOrigin(discovered: string, baseUrl: string, socket: boolean): string {
  const base = new URL(baseUrl)
  const path = new URL(discovered, baseUrl)
  const secure = base.protocol === 'https:'
  const scheme = socket ? (secure ? 'wss:' : 'ws:') : base.protocol
  return `${scheme}//${base.host}${path.pathname}${path.search}`
}

function parseDiscovery(body: unknown, baseUrl: string): SignalKDiscovery | null {
  const v1 = (body as DiscoveryBody | null)?.endpoints?.v1
  const http = v1?.['signalk-http']
  const ws = v1?.['signalk-ws']
  if (typeof http !== 'string' || typeof ws !== 'string') return null
  try {
    return {
      httpUrl: rebaseOnOrigin(http, baseUrl, false),
      wsUrl: rebaseOnOrigin(ws, baseUrl, true),
    }
  } catch {
    return null
  }
}

export function createSignalKClient(options: SignalKClientOptions) {
  const heartbeatMs = options.heartbeatMs ?? SIGNALK_HEARTBEAT_MS
  let state: SignalKConnectionState = 'idle'
  let socket: WebSocketLike | null = null
  let attempt = 0
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let lastMessageAt = 0
  let self: string | null = null
  let stopped = true
  // Incrémenté à chaque (re)connexion : une réponse tardive d'une tentative
  // périmée ne doit pas rouvrir un flux.
  let generation = 0

  const headers = (): Record<string, string> =>
    options.token ? { Authorization: `Bearer ${options.token}` } : {}

  function setState(next: SignalKConnectionState, errorKey: SignalKErrorKey | null = null) {
    state = next
    options.onState(next, errorKey)
  }

  function clearTimers() {
    if (retryTimer !== null) clearTimeout(retryTimer)
    if (heartbeatTimer !== null) clearInterval(heartbeatTimer)
    retryTimer = null
    heartbeatTimer = null
  }

  function closeSocket() {
    if (!socket) return
    socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null
    try {
      socket.close()
    } catch {
      // déjà fermé
    }
    socket = null
  }

  function scheduleReconnect(errorKey: SignalKErrorKey | null) {
    if (stopped) return
    closeSocket()
    clearTimers()
    attempt += 1
    setState('reconnecting', errorKey)
    const delay = Math.min(SIGNALK_MAX_RETRY_MS, retryDelayMs(attempt))
    retryTimer = setTimeout(() => void open(), delay)
  }

  async function discover(): Promise<SignalKDiscovery | SignalKErrorKey> {
    let response
    try {
      response = await options.transport.fetch(`${options.baseUrl}/signalk`, { headers: headers() })
    } catch {
      // `fetch` ne distingue pas un certificat refusé d'un hôte absent : TLS
      // n'est évoqué que pour un serveur en https, c'est le cas qui l'explique.
      return options.baseUrl.startsWith('https:') ? 'tls' : 'unreachable'
    }
    if (response.status === 401 || response.status === 403) return 'unauthorized'
    if (!response.ok) return 'unreachable'
    const discovery = parseDiscovery(await response.json().catch(() => null), options.baseUrl)
    return discovery ?? 'protocol'
  }

  /** `GET …/vessels/self` : 401 ici, c'est « jeton requis » — pas un flux muet. */
  async function probe(httpUrl: string): Promise<SignalKErrorKey | null> {
    try {
      const response = await options.transport.fetch(`${httpUrl}vessels/self`, {
        headers: headers(),
      })
      if (response.status === 401 || response.status === 403) return 'unauthorized'
      return response.ok ? null : 'unreachable'
    } catch {
      return 'unreachable'
    }
  }

  async function open() {
    if (stopped) return
    const current = ++generation
    setState(attempt === 0 ? 'connecting' : 'reconnecting')

    const discovery = await discover()
    if (current !== generation || stopped) return
    if (typeof discovery === 'string') {
      // Un refus d'authentification ne se règle pas en réessayant.
      if (discovery === 'unauthorized' || discovery === 'protocol') {
        clearTimers()
        setState('error', discovery)
        return
      }
      scheduleReconnect(discovery)
      return
    }

    const probeError = await probe(discovery.httpUrl)
    if (current !== generation || stopped) return
    if (probeError === 'unauthorized') {
      clearTimers()
      setState('error', 'unauthorized')
      return
    }
    if (probeError) {
      scheduleReconnect(probeError)
      return
    }

    const query = options.token ? `&token=${encodeURIComponent(options.token)}` : ''
    const ws = options.transport.createWebSocket(`${discovery.wsUrl}?subscribe=none${query}`)
    socket = ws

    ws.onopen = () => {
      attempt = 0
      lastMessageAt = Date.now()
      ws.send(
        JSON.stringify({
          context: options.context,
          subscribe: options.subscriptions ?? subscriptionSpecs(),
        })
      )
      if (options.aisSubscriptions && options.aisSubscriptions.length > 0) {
        ws.send(
          JSON.stringify({ context: AIS_SUBSCRIBE_CONTEXT, subscribe: options.aisSubscriptions })
        )
      }
      setState('open')
      heartbeatTimer = setInterval(
        () => {
          if (Date.now() - lastMessageAt > heartbeatMs) scheduleReconnect(null)
        },
        Math.max(1000, Math.floor(heartbeatMs / 4))
      )
    }
    ws.onmessage = (event) => {
      lastMessageAt = Date.now()
      if (typeof event.data !== 'string') return
      let message: unknown
      try {
        message = JSON.parse(event.data)
      } catch {
        return
      }
      if (typeof message !== 'object' || message === null) return
      const body = message as SignalKDelta & { self?: unknown }
      if (typeof body.self === 'string') self = body.self
      if (Array.isArray(body.updates)) options.onDelta(body, self)
    }
    ws.onerror = () => {
      // `close` suit toujours : la reconnexion se décide là.
    }
    ws.onclose = () => {
      if (!stopped && socket === ws) scheduleReconnect(null)
    }
  }

  function connect() {
    if (!stopped) return
    stopped = false
    attempt = 0
    void open()
  }

  function disconnect() {
    stopped = true
    generation += 1
    clearTimers()
    closeSocket()
    if (state !== 'idle') setState('closed')
  }

  return {
    connect,
    disconnect,
    get state() {
      return state
    },
    get isOpen() {
      return socket !== null && socket.readyState === WS_OPEN
    },
  }
}

export type SignalKClient = ReturnType<typeof createSignalKClient>
