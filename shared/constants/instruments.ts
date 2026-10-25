import type { InstrumentPathSpec } from '#shared/types/instruments'

/**
 * Catalogue des chemins Signal K acceptés (#988) — **liste blanche fermée**,
 * partagée entre l'ingestion (serveur) et le client (PR 2 : abonnement,
 * agrégation, conversion d'unités).
 *
 * Unités : Signal K émet du SI partout — `revolutions` en **hertz** (×60 pour
 * des tr/min), `runTime` en secondes, `currentLevel` / `stateOfCharge` en
 * ratio 0–1, vitesses en m/s, températures en kelvin, angles en radians,
 * pressions en pascals, volumes en m³ (D8). La base stocke ces valeurs telles
 * quelles.
 */

/** Taille maximale d'un lot de télémétrie (`samples`). */
export const TELEMETRY_MAX_BATCH_SIZE = 500

/** Fenêtre, en minutes, de la série récente servie avec la fiche bateau. */
export const TELEMETRY_RECENT_WINDOW_MIN = 60

/**
 * Tolérance, en minutes, sur un `recordedAt` dans le futur (D9) : au-delà, le
 * lot est refusé — horloge d'appareil fausse ou passerelle qui rejoue.
 */
export const TELEMETRY_FUTURE_TOLERANCE_MIN = 5

/** Longueur maximale d'un chemin Signal K (colonne `path`). */
export const TELEMETRY_PATH_MAX_LENGTH = 96

/** Borne absolue des valeurs numériques (colonne `numeric(14,4)`). */
export const TELEMETRY_VALUE_ABS_MAX = 9_999_999_999

/** Contexte Signal K lu par défaut. */
export const INSTRUMENT_DEFAULT_VESSEL_CONTEXT = 'vessels.self'

export const INSTRUMENT_PATH_CATALOG: readonly InstrumentPathSpec[] = [
  // Propulsion — un moteur par `<id>` (`port`, `starboard`, `0`…), apparié en
  // PR 4 à `boat_engines.instrument_key`.
  numeric('propulsion.<id>.runTime', 'propulsion', 's', 'h'),
  numeric('propulsion.<id>.revolutions', 'propulsion', 'Hz', 'rpm'),
  numeric('propulsion.<id>.temperature', 'propulsion', 'K', '°C'),
  numeric('propulsion.<id>.coolantTemperature', 'propulsion', 'K', '°C'),
  numeric('propulsion.<id>.oilPressure', 'propulsion', 'Pa', 'bar'),
  numeric('propulsion.<id>.fuel.rate', 'propulsion', 'm3/s', 'L/h'),
  numeric('propulsion.<id>.oilTemperature', 'propulsion', 'K', '°C'),
  numeric('propulsion.<id>.exhaustTemperature', 'propulsion', 'K', '°C'),
  numeric('propulsion.<id>.coolantPressure', 'propulsion', 'Pa', 'bar'),
  numeric('propulsion.<id>.boostPressure', 'propulsion', 'Pa', 'bar'),
  numeric('propulsion.<id>.engineLoad', 'propulsion', 'ratio', '%'),
  numeric('propulsion.<id>.alternatorVoltage', 'propulsion', 'V', 'V'),

  // Navigation
  json('navigation.position', 'navigation'),
  numeric('navigation.speedOverGround', 'navigation', 'm/s', 'kn'),
  numeric('navigation.courseOverGroundTrue', 'navigation', 'rad', '°'),
  numeric('navigation.headingTrue', 'navigation', 'rad', '°'),
  numeric('navigation.headingMagnetic', 'navigation', 'rad', '°'),
  numeric('navigation.speedThroughWater', 'navigation', 'm/s', 'kn'),
  numeric('navigation.log', 'navigation', 'm', 'NM'),
  numeric('navigation.trip.log', 'navigation', 'm', 'NM'),

  // Énergie — une batterie par `<id>` (`house`, `start`, `0`…).
  numeric('electrical.batteries.<id>.voltage', 'electrical', 'V', 'V'),
  numeric('electrical.batteries.<id>.current', 'electrical', 'A', 'A'),
  numeric('electrical.batteries.<id>.capacity.stateOfCharge', 'electrical', 'ratio', '%'),
  numeric('electrical.batteries.<id>.temperature', 'electrical', 'K', '°C'),
  numeric('electrical.batteries.<id>.capacity.timeRemaining', 'electrical', 's', 'h'),
  numeric('electrical.batteries.<id>.capacity.stateOfHealth', 'electrical', 'ratio', '%'),

  // Production et conversion — un appareil par `<id>` (contrôleur solaire,
  // chargeur, onduleur), comme les batteries.
  numeric('electrical.solar.<id>.panelVoltage', 'electrical', 'V', 'V'),
  numeric('electrical.solar.<id>.panelCurrent', 'electrical', 'A', 'A'),
  numeric('electrical.solar.<id>.current', 'electrical', 'A', 'A'),
  numeric('electrical.chargers.<id>.voltage', 'electrical', 'V', 'V'),
  numeric('electrical.chargers.<id>.current', 'electrical', 'A', 'A'),
  numeric('electrical.inverters.<id>.dc.voltage', 'electrical', 'V', 'V'),
  numeric('electrical.inverters.<id>.dc.current', 'electrical', 'A', 'A'),
  numeric('electrical.inverters.<id>.ac.realPower', 'electrical', 'W', 'W'),

  // Réservoirs — `<type>` (`fuel`, `freshWater`, `blackWater`…) puis `<id>`.
  numeric('tanks.<type>.<id>.currentLevel', 'tanks', 'ratio', '%'),
  numeric('tanks.<type>.<id>.capacity', 'tanks', 'm3', 'L'),
  numeric('tanks.<type>.<id>.currentVolume', 'tanks', 'm3', 'L'),

  // Environnement
  numeric('environment.wind.speedApparent', 'environment', 'm/s', 'kn'),
  numeric('environment.wind.speedTrue', 'environment', 'm/s', 'kn'),
  numeric('environment.wind.angleApparent', 'environment', 'rad', '°'),
  numeric('environment.wind.angleTrueWater', 'environment', 'rad', '°'),
  numeric('environment.wind.directionTrue', 'environment', 'rad', '°'),
  numeric('environment.depth.belowTransducer', 'environment', 'm', 'm'),
  numeric('environment.depth.belowKeel', 'environment', 'm', 'm'),
  numeric('environment.depth.belowSurface', 'environment', 'm', 'm'),
  numeric('environment.water.temperature', 'environment', 'K', '°C'),
  numeric('environment.outside.temperature', 'environment', 'K', '°C'),
  numeric('environment.outside.pressure', 'environment', 'Pa', 'hPa'),
  numeric('environment.wind.speedOverGround', 'environment', 'm/s', 'kn'),
  numeric('environment.wind.angleTrueGround', 'environment', 'rad', '°'),
  numeric('environment.wind.directionMagnetic', 'environment', 'rad', '°'),
  numeric('environment.outside.relativeHumidity', 'environment', 'ratio', '%'),
  numeric('environment.inside.temperature', 'environment', 'K', '°C'),
  numeric('environment.inside.relativeHumidity', 'environment', 'ratio', '%'),
  // Zones nommées du bord (`engineRoom`, `mainCabin`, `refrigerator`…).
  numeric('environment.inside.<zone>.temperature', 'environment', 'K', '°C'),
  numeric('environment.inside.<zone>.relativeHumidity', 'environment', 'ratio', '%'),
  numeric('environment.tide.heightNow', 'environment', 'm', 'm'),

  // Alarmes Signal K : valeur structurée `{ state, message, method }`, sous
  // n'importe quel chemin (`notifications.<chemin>`).
  json('notifications.<path>', 'notifications'),
]

function numeric(
  pattern: string,
  category: InstrumentPathSpec['category'],
  siUnit: string,
  displayUnit: string
): InstrumentPathSpec {
  return { pattern, category, valueKind: 'number', siUnit, displayUnit }
}

function json(pattern: string, category: InstrumentPathSpec['category']): InstrumentPathSpec {
  return { pattern, category, valueKind: 'json', siUnit: null, displayUnit: null }
}

/** Un segment libre d'un chemin Signal K (identifiant de moteur, de batterie, type de réservoir). */
const SEGMENT = '[A-Za-z0-9_-]+'

function patternToRegExp(pattern: string): RegExp {
  const source = pattern
    .split('.')
    .map((segment) => {
      if (segment === '<path>') return `${SEGMENT}(?:\\.${SEGMENT})*`
      if (segment.startsWith('<') && segment.endsWith('>')) return SEGMENT
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('\\.')
  return new RegExp(`^${source}$`)
}

const COMPILED_CATALOG: ReadonlyArray<{ spec: InstrumentPathSpec; regexp: RegExp }> =
  INSTRUMENT_PATH_CATALOG.map((spec) => ({ spec, regexp: patternToRegExp(spec.pattern) }))

/** L'entrée du catalogue qui accepte ce chemin, ou `null`. */
export function telemetryPathSpec(path: string): InstrumentPathSpec | null {
  if (path.length === 0 || path.length > TELEMETRY_PATH_MAX_LENGTH) return null
  const found = COMPILED_CATALOG.find(({ regexp }) => regexp.test(path))
  return found ? found.spec : null
}

export function isAllowedTelemetryPath(path: string): boolean {
  return telemetryPathSpec(path) !== null
}

/**
 * Plages de l'historique (#992) : durée couverte et largeur d'un seau
 * `date_bin`. Les seaux restent à 60–168 points par courbe, quelle que soit la
 * plage — un graphique lisible et une réponse légère.
 */
export const TELEMETRY_SERIES_RANGES = {
  '1h': { minutes: 60, binMinutes: 1 },
  '24h': { minutes: 24 * 60, binMinutes: 15 },
  '7d': { minutes: 7 * 24 * 60, binMinutes: 60 },
} as const

export const TELEMETRY_SERIES_DEFAULT_RANGE = '24h'

/** Nombre maximal de courbes demandées d'un coup. */
export const TELEMETRY_SERIES_MAX_PATHS = 6

/** Vrai si `path` est accepté par le motif du catalogue (`<id>` = un segment libre). */
export function matchesCatalogPattern(pattern: string, path: string): boolean {
  let regexp = PATTERN_CACHE.get(pattern)
  if (!regexp) {
    regexp = patternToRegExp(pattern)
    PATTERN_CACHE.set(pattern, regexp)
  }
  return regexp.test(path)
}

const PATTERN_CACHE = new Map<string, RegExp>()

/** Préfixe des jetons d'ingestion du plugin (#994) : repérable dans un dépôt ou un journal. */
export const INSTRUMENT_INGEST_TOKEN_PREFIX = 'fai_ing_'

/** Entropie d'un jeton d'ingestion, en octets (encodés en base64url). */
export const INSTRUMENT_INGEST_TOKEN_BYTES = 32

/** Garde-fou sur la longueur d'un en-tête `Bearer` avant tout hachage. */
export const INSTRUMENT_INGEST_TOKEN_MAX_LENGTH = 128

/** Chemin de l'API d'ingestion du plugin. */
export const INSTRUMENT_INGEST_PATH = '/api/instruments/ingest'

/**
 * Plugin Signal K (#1021) — vocabulaire figé que partagent le script
 * d'installation, la page publique (#1022), l'assistant (#1023) et le plugin
 * lui-même (#1024, dépôt séparé). Une garde d'hygiène relit le script sur
 * disque et le compare à ces valeurs.
 */

/** Nom du paquet npm du plugin. */
export const SIGNALK_PLUGIN_PACKAGE = 'signalk-fleetai'

/** Chemin public du script d'installation (servi par `InstallScriptsController`). */
export const SIGNALK_PLUGIN_INSTALL_PATH = '/install/signalk-plugin.sh'

/** Fichier de configuration du plugin, relatif au dossier de configuration Signal K. */
export const SIGNALK_PLUGIN_CONFIG_FILE = 'plugin-config-data/signalk-fleetai.json'

/** Variable d'environnement portant le jeton d'ingestion. */
export const SIGNALK_PLUGIN_ENV_TOKEN = 'FLEETAI_TOKEN'

/** Variable d'environnement portant l'URL d'ingestion (défaut : celle de l'instance servante). */
export const SIGNALK_PLUGIN_ENV_ENDPOINT = 'FLEETAI_ENDPOINT'

/** Marqueur du script remplacé par `${origine}${INSTRUMENT_INGEST_PATH}` au service. */
export const SIGNALK_PLUGIN_ENDPOINT_MARKER = '__FLEETAI_INGEST_ENDPOINT__'

/** Assistant « Connecter mon bateau » (#1023). */
export const INSTRUMENT_SETUP_POLL_INTERVAL_MS = 10_000
/** Attente maximale du premier lot du plugin avant « Toujours rien ? ». */
export const INSTRUMENT_SETUP_POLL_MAX_MS = 10 * 60_000
/** Un `lastSeenAt` plus récent que cela compte comme « connecté ». */
export const INSTRUMENT_SETUP_RECENT_MS = 10 * 60_000
export const INSTRUMENT_SETUP_STORAGE_PREFIX = 'fleetai:instrument-setup:'

/** Adresse LAN proposée selon le matériel (vide : rien de plausible à proposer). */
export const INSTRUMENT_SETUP_DEFAULT_URLS = {
  none: '',
  cerbo: 'http://venus.local:3000',
  signalk: 'http://openplotter.local:3000',
} as const

/**
 * Adresse enregistrée quand l'admin n'en donne pas sur le chemin plugin : la
 * source exige une origine (`base_url` NOT NULL), mais seul le plugin pousse.
 */
export const INSTRUMENT_SETUP_PLUGIN_PLACEHOLDER_URL = 'http://signalk.local:3000'
