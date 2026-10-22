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
  /** Règles du bateau (#993) — vide hors source ou sans droit de lecture. */
  rules: InstrumentAlertRuleRow[]
  /** Alertes ouvertes, la plus récente d'abord (#993). */
  openAlerts: InstrumentAlertRow[]
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

/** Plage de l'historique (#992). */
export type TelemetrySeriesRange = '1h' | '24h' | '7d'

/** Un seau d'historique : `[début du seau ISO, moyenne]`, en unité SI. */
export type TelemetrySeriesPoint = [string, number]

/** Séries agrégées par chemin, du plus ancien au plus récent. */
export interface InstrumentSeries {
  range: TelemetrySeriesRange
  series: Record<string, TelemetrySeriesPoint[]>
}

/** Demande d'historique lue dans la requête de `boats.show`. */
export interface InstrumentSeriesQuery {
  range: TelemetrySeriesRange
  paths: string[]
}

/** Alertes des instruments (#993). */
export type InstrumentAlertOperator = 'lt' | 'gt'
export type InstrumentAlertSeverity = 'warning' | 'critical'

/**
 * Une règle évaluable, côté serveur comme côté client. `pathPattern` est un
 * motif du catalogue (règle intégrée) ou un chemin concret (règle admin) ;
 * `threshold` et `hysteresis` sont en unités SI.
 */
export interface InstrumentAlertRuleSpec {
  /** `builtin:<id>` ou `rule:<id>` — stable, c'est la clé de l'alerte ouverte. */
  key: string
  pathPattern: string
  kind: 'threshold' | 'signalk_alarm'
  operator: InstrumentAlertOperator
  threshold: number
  hysteresis: number
  severity: InstrumentAlertSeverity
}

export interface InstrumentAlertSample {
  path: string
  value: number | null
  valueJson: JsonValue | null
}

export type InstrumentAlertDecision = 'open' | 'keep' | 'clear' | 'none'

/** Un changement d'état décidé par `evaluateAlerts`. */
export interface InstrumentAlertTransition {
  ruleKey: string
  path: string
  decision: Exclude<InstrumentAlertDecision, 'none'>
  severity: InstrumentAlertSeverity
  value: number | null
  /** État Signal K (`alarm`, `emergency`…) ou message de l'alarme, sinon `null`. */
  message: string | null
}

/** Règle administrable d'un bateau, en unités SI. */
export interface InstrumentAlertRuleRow {
  id: number
  path: string
  operator: InstrumentAlertOperator
  threshold: number
  hysteresis: number
  severity: InstrumentAlertSeverity
  enabled: boolean
}

export interface InstrumentAlertRow {
  id: number
  ruleKey: string
  path: string
  severity: InstrumentAlertSeverity
  openedAt: string
  clearedAt: string | null
  lastValue: number | null
  message: string | null
}

/** Formulaire d'une règle : `threshold` et `hysteresis` dans l'unité d'affichage du chemin. */
export interface UpsertInstrumentAlertRulePayload {
  path: string
  operator: InstrumentAlertOperator
  threshold: number
  hysteresis?: number
  severity: InstrumentAlertSeverity
  enabled?: boolean
}
