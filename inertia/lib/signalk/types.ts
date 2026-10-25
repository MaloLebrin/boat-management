import type { InstrumentProbeErrorKey } from '#shared/types/instruments'
import type { JsonValue } from '#shared/types/notification'

/**
 * Types du client Signal K (#989, épopée #986). Pur : aucun import Vue, ni
 * Inertia — `WebSocket` et `fetch` sont injectés pour pouvoir tester le
 * client avec un faux serveur.
 */

/** Une valeur de chemin dans un delta Signal K. */
export interface SignalKPathValue {
  path: string
  value: unknown
}

export interface SignalKUpdate {
  timestamp?: string
  values?: SignalKPathValue[]
}

export interface SignalKDelta {
  context?: string
  updates?: SignalKUpdate[]
}

/** Réponse de `GET /signalk`, réduite à ce que le client utilise. */
export interface SignalKDiscovery {
  httpUrl: string
  wsUrl: string
}

/** Un abonnement envoyé après l'ouverture du WebSocket. */
export interface SubscriptionSpec {
  path: string
  /** Période en millisecondes (`policy: fixed`). */
  period: number
  minPeriod: number
  policy: 'instant' | 'fixed' | 'ideal'
}

export type SignalKConnectionState =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'reconnecting'
  | 'closed'
  | 'error'

/** Pourquoi la connexion ne marche pas — porté par l'UI (PR 3). */
export type SignalKErrorKey = Exclude<InstrumentProbeErrorKey, 'invalid_url'>

/** Sous-ensemble de l'API `WebSocket` utilisé par le client. */
export interface WebSocketLike {
  readonly readyState: number
  onopen: ((event: unknown) => void) | null
  onmessage: ((event: { data: unknown }) => void) | null
  onclose: ((event: { code?: number }) => void) | null
  onerror: ((event: unknown) => void) | null
  send(data: string): void
  close(code?: number): void
}

export interface SignalKTransport {
  fetch: (
    input: string,
    init?: { headers?: Record<string, string> }
  ) => Promise<{
    ok: boolean
    status: number
    json(): Promise<unknown>
  }>
  createWebSocket: (url: string) => WebSocketLike
}

/** Un échantillon normalisé : numérique ou structuré, jamais les deux. */
export interface NormalizedSample {
  path: string
  value: number | null
  valueJson: JsonValue | null
  /** `timestamp` Signal K du delta, conservé pour la position (D9). */
  signalkTimestamp: string | null
}
