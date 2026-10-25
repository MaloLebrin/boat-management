import { AIS_SUBSCRIBE_CONTEXT } from '#shared/constants/ais'
import { retryDelayMs } from '#shared/helpers/offline_retry'
import { subscriptionSpecs } from './path_catalog'
import { isMixedContent } from './url_security'
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
  /** `location.protocol` de la page : `https:` + adresse `http:` = contenu mixte (#1019). */
  pageProtocol?: string
}

interface DiscoveryBody {
  endpoints?: Record<string, Record<string, unknown> | undefined>
  server?: { version?: unknown }
}

type Fetch = SignalKTransport['fetch']

export type DiscoverResult =
  | { ok: true; discovery: SignalKDiscovery; serverVersion: string | null }
  | { ok: false; error: SignalKErrorKey; status: number | null }

export type VesselsSelfResult =
  | { ok: true; body: unknown }
  | {
      ok: false
      error: Extract<SignalKErrorKey, 'unauthorized' | 'unreachable'>
      status: number | null
    }

/** Reprend le chemin d'une URL découverte mais l'origine (et le schéma) configurés. */
export function rebaseOnOrigin(discovered: string, baseUrl: string, socket: boolean): string {
  const base = new URL(baseUrl)
  const path = new URL(discovered, baseUrl)
  const secure = base.protocol === 'https:'
  const scheme = socket ? (secure ? 'wss:' : 'ws:') : base.protocol
  return `${scheme}//${base.host}${path.pathname}${path.search}`
}

export function parseDiscovery(body: unknown, baseUrl: string): SignalKDiscovery | null {
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

/** `GET {baseUrl}/signalk` : découverte REST et lecture de la version du serveur. */
export async function discoverSignalK(
  fetchFn: Fetch,
  baseUrl: string,
  headers: Record<string, string>
): Promise<DiscoverResult> {
  let response
  try {
    response = await fetchFn(`${baseUrl}/signalk`, { headers })
  } catch {
    // `fetch` ne distingue pas un certificat refusé d'un hôte absent : TLS
    // n'est évoqué que pour un serveur en https, c'est le cas qui l'explique.
    return { ok: false, error: baseUrl.startsWith('https:') ? 'tls' : 'unreachable', status: null }
  }
  if (response.status === 401 || response.status === 403) {
    return { ok: false, error: 'unauthorized', status: response.status }
  }
  if (!response.ok) return { ok: false, error: 'unreachable', status: response.status }
  const body = await response.json().catch(() => null)
  const discovery = parseDiscovery(body, baseUrl)
  if (!discovery) return { ok: false, error: 'protocol', status: response.status }
  const version = (body as DiscoveryBody).server?.version
  return {
    ok: true,
    discovery,
    serverVersion: typeof version === 'string' ? version : null,
  }
}

/** `GET …/vessels/self` : 401 ici, c'est « jeton requis » — pas un flux muet. */
export async function probeVesselsSelf(
  fetchFn: Fetch,
  httpUrl: string,
  headers: Record<string, string>
): Promise<VesselsSelfResult> {
  try {
    const response = await fetchFn(`${httpUrl}vessels/self`, { headers })
    if (response.status === 401 || response.status === 403) {
      return { ok: false, error: 'unauthorized', status: response.status }
    }
    if (!response.ok) return { ok: false, error: 'unreachable', status: response.status }
    return { ok: true, body: await response.json().catch(() => null) }
  } catch {
    return { ok: false, error: 'unreachable', status: null }
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

  async function open() {
    if (stopped) return
    const current = ++generation
    if (isMixedContent(options.baseUrl, options.pageProtocol)) {
      // Le navigateur bloquerait chaque requête : inutile d'en tenter une.
      clearTimers()
      setState('error', 'mixed_content')
      return
    }
    setState(attempt === 0 ? 'connecting' : 'reconnecting')

    const fetchFn = options.transport.fetch
    const found = await discoverSignalK(fetchFn, options.baseUrl, headers())
    if (current !== generation || stopped) return
    if (!found.ok) {
      // Un refus d'authentification ne se règle pas en réessayant.
      if (found.error === 'unauthorized' || found.error === 'protocol') {
        clearTimers()
        setState('error', found.error)
        return
      }
      scheduleReconnect(found.error)
      return
    }
    const discovery = found.discovery

    const probed = await probeVesselsSelf(fetchFn, discovery.httpUrl, headers())
    if (current !== generation || stopped) return
    if (!probed.ok && probed.error === 'unauthorized') {
      clearTimers()
      setState('error', 'unauthorized')
      return
    }
    if (!probed.ok) {
      scheduleReconnect(probed.error)
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
