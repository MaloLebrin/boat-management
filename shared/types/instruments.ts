import type { DateTime } from 'luxon'
import type { JsonValue } from '#shared/types/notification'

/**
 * Instruments de bord via Signal K (#986, socle #988).
 *
 * Une **source** est le serveur Signal K d'un bateau ; un **échantillon** est
 * une valeur d'un chemin Signal K datée par le client (fenêtre d'agrégation,
 * horloge de l'appareil — décision D9). Les valeurs sont stockées en unités
 * SI telles que Signal K les émet (D8) ; la conversion se fait à l'affichage.
 */

export type InstrumentSourceKind = 'signalk'

/** Ce qu'un lecteur de la fiche bateau voit d'une source — jamais le jeton. */
export interface InstrumentSourceRow {
  id: number
  boatId: number
  kind: InstrumentSourceKind
  /** Origine `https?://hôte[:port]`, sans chemin : c'est aussi la valeur CSP. */
  baseUrl: string
  /** Contexte Signal K lu (`vessels.self` par défaut). */
  vesselContext: string
  enabled: boolean
  /** Un jeton est enregistré (sa valeur ne sort que dans `InstrumentSourceConnection`). */
  hasToken: boolean
  lastSeenAt: string | null
  lastError: string | null
}

/**
 * La source avec son jeton en clair, servie **uniquement** dans la prop
 * différée `instruments` et seulement à qui peut ingérer (`boats.edit`) —
 * D3. `token` vaut `null` sans jeton ou sans ce droit.
 */
export interface InstrumentSourceConnection extends InstrumentSourceRow {
  token: string | null
}

/** Un échantillon envoyé par le client : numérique (`value`) ou structuré (`valueJson`). */
export interface TelemetrySampleInput {
  path: string
  /** ISO 8601, horloge du client arrondie à la fenêtre d'agrégation (D9). */
  recordedAt: string
  value?: number | null
  valueJson?: JsonValue | null
}

export interface TelemetryBatchPayload {
  sourceId: number
  /** UUID posé par le client, pour les journaux seulement (D4). */
  batchId: string
  samples: TelemetrySampleInput[]
}

export type TelemetryIngestOrigin = 'pwa' | 'plugin'

export interface TelemetryIngestMeta {
  origin: TelemetryIngestOrigin
}

export interface TelemetryIngestResult {
  /** Lignes réellement insérées. */
  accepted: number
  /** Rejeux ignorés par la contrainte unique `(source_id, path, recorded_at)`. */
  ignored: number
}

/** Dernière valeur connue d'un chemin pour un bateau. */
export interface TelemetryLatestValue {
  path: string
  recordedAt: string
  value: number | null
  valueJson: JsonValue | null
}

/** Un point de série récente : `[recordedAt ISO, valeur]`. */
export type TelemetryRecentPoint = [string, number]

export interface InstrumentsTabCapabilities {
  /** Enregistrer ou révoquer la source (`instruments.manage`, admin). */
  manage: boolean
  /** Pousser de la télémétrie et recevoir le jeton (`boats.edit`). */
  ingest: boolean
}

/**
 * Prop différée `instruments` de la fiche bateau. Jamais `null` (#478) : sans
 * le flag de plan, `source` est `null` et les listes sont vides.
 */
export interface InstrumentsTabProps {
  source: InstrumentSourceConnection | null
  latest: TelemetryLatestValue[]
  /** Chemins numériques des `TELEMETRY_RECENT_WINDOW_MIN` dernières minutes. */
  recent: Record<string, TelemetryRecentPoint[]>
  can: InstrumentsTabCapabilities
}

/**
 * Formulaire de source. `token` absent = conserver le jeton enregistré,
 * `null` ou vide = l'effacer, chaîne = le remplacer.
 */
export interface UpsertInstrumentSourcePayload {
  baseUrl: string
  token?: string | null
  vesselContext?: string | null
  enabled?: boolean
}

export type InstrumentCategory =
  | 'propulsion'
  | 'navigation'
  | 'electrical'
  | 'tanks'
  | 'environment'
  | 'notifications'

/** Une entrée du catalogue de chemins (`INSTRUMENT_PATH_CATALOG`). */
export interface InstrumentPathSpec {
  /** Motif Signal K, avec `<id>` / `<type>` pour les segments libres. */
  pattern: string
  category: InstrumentCategory
  /** `number` → colonne `value` ; `json` → colonne `value_json`. */
  valueKind: 'number' | 'json'
  /** Unité telle qu'émise par Signal K (SI), `null` pour une valeur structurée. */
  siUnit: string | null
  /** Unité d'affichage cible (conversion côté client, PR 2). */
  displayUnit: string | null
}

/** Un fix issu des instruments, prêt pour `boat_position_history` (#991). */
export interface InstrumentPositionInput {
  latitude: number
  longitude: number
  /** Vitesse fond en nœuds, `null` si le lot n'en portait pas. */
  sogKn: number | null
  /** Cap fond en degrés, `null` si le lot n'en portait pas. */
  cogDeg: number | null
  recordedAt: DateTime
}

/** Ce que la synchronisation a fait des heures d'un moteur. */
export interface EngineHoursSyncOutcome {
  engineId: number
  action: 'init' | 'rebase' | 'increment' | 'none'
  /** Heures ajoutées à `hours` (0 hors `increment`). */
  hoursAdded: number
}
