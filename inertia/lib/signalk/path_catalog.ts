import { INSTRUMENT_PATH_CATALOG, telemetryPathSpec } from '#shared/constants/instruments'
import type { SubscriptionSpec } from './types'

/**
 * Cadence d'échantillonnage par chemin (#989) : une valeur par fenêtre,
 * réduite par `aggregate`. Le catalogue partagé dit **quels** chemins existent ;
 * ce fichier dit **à quelle cadence** le client les garde. Mesure du spike :
 * 12 deltas/s sur 17 chemins avec `policy: instant` — l'agrégation n'est pas
 * optionnelle.
 */
export type AggregateKind = 'last' | 'mean' | 'max'

export interface PathRule {
  /** Durée de la fenêtre d'agrégation, en secondes ; `0` = chaque changement. */
  intervalS: number
  aggregate: AggregateKind
}

const DEFAULT_RULE: PathRule = { intervalS: 60, aggregate: 'last' }

/** Règles par motif du catalogue ; tout motif absent retombe sur `DEFAULT_RULE`. */
const RULES: Record<string, PathRule> = {
  'propulsion.<id>.runTime': { intervalS: 300, aggregate: 'last' },
  'propulsion.<id>.revolutions': { intervalS: 60, aggregate: 'mean' },
  'propulsion.<id>.temperature': { intervalS: 60, aggregate: 'max' },
  'propulsion.<id>.coolantTemperature': { intervalS: 60, aggregate: 'max' },
  'propulsion.<id>.oilPressure': { intervalS: 60, aggregate: 'mean' },
  'propulsion.<id>.fuel.rate': { intervalS: 60, aggregate: 'mean' },
  'propulsion.<id>.oilTemperature': { intervalS: 60, aggregate: 'max' },
  'propulsion.<id>.exhaustTemperature': { intervalS: 60, aggregate: 'max' },
  'propulsion.<id>.coolantPressure': { intervalS: 60, aggregate: 'mean' },
  'propulsion.<id>.boostPressure': { intervalS: 60, aggregate: 'mean' },
  'propulsion.<id>.engineLoad': { intervalS: 60, aggregate: 'mean' },
  'propulsion.<id>.alternatorVoltage': { intervalS: 60, aggregate: 'mean' },
  'navigation.log': { intervalS: 300, aggregate: 'last' },
  'navigation.trip.log': { intervalS: 300, aggregate: 'last' },
  'navigation.position': { intervalS: 60, aggregate: 'last' },
  'navigation.speedOverGround': { intervalS: 30, aggregate: 'mean' },
  'navigation.speedThroughWater': { intervalS: 30, aggregate: 'mean' },
  'electrical.batteries.<id>.voltage': { intervalS: 60, aggregate: 'mean' },
  'electrical.batteries.<id>.current': { intervalS: 60, aggregate: 'mean' },
  'electrical.batteries.<id>.capacity.stateOfCharge': { intervalS: 300, aggregate: 'last' },
  'tanks.<type>.<id>.currentLevel': { intervalS: 300, aggregate: 'last' },
  'tanks.<type>.<id>.capacity': { intervalS: 3600, aggregate: 'last' },
  'tanks.<type>.<id>.currentVolume': { intervalS: 300, aggregate: 'last' },
  'electrical.batteries.<id>.capacity.timeRemaining': { intervalS: 300, aggregate: 'last' },
  'electrical.batteries.<id>.capacity.stateOfHealth': { intervalS: 3600, aggregate: 'last' },
  'electrical.solar.<id>.panelVoltage': { intervalS: 60, aggregate: 'mean' },
  'electrical.solar.<id>.panelCurrent': { intervalS: 60, aggregate: 'mean' },
  'electrical.solar.<id>.current': { intervalS: 60, aggregate: 'mean' },
  'electrical.chargers.<id>.voltage': { intervalS: 60, aggregate: 'mean' },
  'electrical.chargers.<id>.current': { intervalS: 60, aggregate: 'mean' },
  'electrical.inverters.<id>.dc.voltage': { intervalS: 60, aggregate: 'mean' },
  'electrical.inverters.<id>.dc.current': { intervalS: 60, aggregate: 'mean' },
  'electrical.inverters.<id>.ac.realPower': { intervalS: 60, aggregate: 'mean' },
  'environment.wind.speedOverGround': { intervalS: 30, aggregate: 'max' },
  'environment.outside.relativeHumidity': { intervalS: 300, aggregate: 'last' },
  'environment.inside.temperature': { intervalS: 300, aggregate: 'mean' },
  'environment.inside.relativeHumidity': { intervalS: 300, aggregate: 'last' },
  'environment.inside.<zone>.temperature': { intervalS: 300, aggregate: 'max' },
  'environment.inside.<zone>.relativeHumidity': { intervalS: 300, aggregate: 'last' },
  'environment.tide.heightNow': { intervalS: 300, aggregate: 'last' },
  'environment.wind.speedApparent': { intervalS: 30, aggregate: 'max' },
  'environment.wind.speedTrue': { intervalS: 30, aggregate: 'max' },
  'environment.depth.belowTransducer': { intervalS: 30, aggregate: 'mean' },
  'environment.depth.belowKeel': { intervalS: 30, aggregate: 'mean' },
  'environment.depth.belowSurface': { intervalS: 30, aggregate: 'mean' },
  // Une alarme ne se moyenne pas et ne doit pas attendre : chaque changement.
  'notifications.<path>': { intervalS: 0, aggregate: 'last' },
}

/** Les angles et les moyennes de directions n'ont pas de sens : dernière valeur. */
export function ruleForPath(path: string): PathRule {
  const spec = telemetryPathSpec(path)
  if (!spec) return DEFAULT_RULE
  return RULES[spec.pattern] ?? DEFAULT_RULE
}

/** Joker Signal K pour un motif du catalogue (`propulsion.*.runTime`). */
function wildcardPath(pattern: string): string {
  return pattern.replace(/<path>/g, '*').replace(/<[a-z]+>/g, '*')
}

/**
 * Abonnements à envoyer au serveur : un par motif du catalogue. `fixed` +
 * `period` ramène déjà le débit du serveur à celui qu'on garde ; les alarmes
 * restent en `instant`.
 */
export function subscriptionSpecs(): SubscriptionSpec[] {
  return INSTRUMENT_PATH_CATALOG.map((spec) => {
    const rule = RULES[spec.pattern] ?? DEFAULT_RULE
    if (rule.intervalS === 0) {
      return { path: wildcardPath(spec.pattern), period: 0, minPeriod: 0, policy: 'instant' }
    }
    const period = Math.max(1000, Math.round((rule.intervalS * 1000) / 2))
    return { path: wildcardPath(spec.pattern), period, minPeriod: 500, policy: 'fixed' }
  })
}
