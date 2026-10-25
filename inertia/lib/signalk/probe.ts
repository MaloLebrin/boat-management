import type { InstrumentProbeInventory, InstrumentProbeResult } from '#shared/types/instruments'
import { discoverSignalK, probeVesselsSelf } from './client'
import type { SignalKTransport } from './types'
import { isMixedContent } from './url_security'

export { isMixedContent }

/**
 * Sonde de diagnostic d'un serveur Signal K (#1019, socle de l'assistant
 * #1023) : adresse → découverte → `vessels/self` → inventaire. Pur — `fetch`
 * est injecté.
 */

/**
 * La CSP `connect-src` est posée **par document** (`applyInstrumentCsp`, D10) :
 * une réponse XHR Inertia ne change pas celle de la page. Une origine nouvelle
 * (ou une première source) exige donc un rechargement complet.
 */
export function needsFullReloadForCsp(
  previousBaseUrl: string | null | undefined,
  nextBaseUrl: string
): boolean {
  if (!previousBaseUrl) return true
  try {
    return new URL(previousBaseUrl).origin !== new URL(nextBaseUrl).origin
  } catch {
    return true
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function keysOf(value: unknown): string[] {
  return isRecord(value) ? Object.keys(value) : []
}

/** Extrait ce que `vessels/self` expose : moteurs, batteries, réservoirs, position. */
export function inventoryFromVessel(
  body: unknown,
  serverVersion: string | null = null
): InstrumentProbeInventory {
  const vessel = isRecord(body) ? body : {}
  const electrical = isRecord(vessel.electrical) ? vessel.electrical : {}
  const tanks = isRecord(vessel.tanks) ? vessel.tanks : {}
  const navigation = isRecord(vessel.navigation) ? vessel.navigation : {}
  const position = isRecord(navigation.position) ? navigation.position : {}
  const fix = isRecord(position.value) ? position.value : {}

  return {
    serverVersion,
    vesselName: typeof vessel.name === 'string' && vessel.name !== '' ? vessel.name : null,
    engineIds: keysOf(vessel.propulsion),
    batteryIds: keysOf(electrical.batteries),
    tankIds: Object.keys(tanks).flatMap((type) => keysOf(tanks[type]).map((id) => `${type}.${id}`)),
    hasPosition: typeof fix.latitude === 'number' && typeof fix.longitude === 'number',
  }
}

export interface ProbeSignalKOptions {
  baseUrl: string
  token: string | null
  /** `location.protocol` de la page. */
  pageProtocol?: string
  fetch: SignalKTransport['fetch']
  /** Vérifie seulement l'adresse (URL valide, pas de contenu mixte) : aucune requête. */
  preflight?: boolean
}

function normalizeBaseUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.origin
  } catch {
    return null
  }
}

export async function probeSignalKServer(
  options: ProbeSignalKOptions
): Promise<InstrumentProbeResult> {
  const baseUrl = normalizeBaseUrl(options.baseUrl)
  if (!baseUrl) return { ok: false, error: 'invalid_url', status: null }
  if (isMixedContent(baseUrl, options.pageProtocol)) {
    return { ok: false, error: 'mixed_content', status: null }
  }
  if (options.preflight) return { ok: true, inventory: null }

  const headers: Record<string, string> = options.token
    ? { Authorization: `Bearer ${options.token}` }
    : {}
  const found = await discoverSignalK(options.fetch, baseUrl, headers)
  if (!found.ok) return found

  const vessel = await probeVesselsSelf(options.fetch, found.discovery.httpUrl, headers)
  if (!vessel.ok) return vessel
  // Un serveur Signal K répond toujours par un objet JSON ici.
  if (!isRecord(vessel.body)) return { ok: false, error: 'protocol', status: 200 }
  return { ok: true, inventory: inventoryFromVessel(vessel.body, found.serverVersion) }
}
