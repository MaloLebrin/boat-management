import { matchesCatalogPattern } from '../constants/instruments.js'
import { BUILTIN_ALERT_RULES, SIGNALK_ALARM_OPEN_STATES } from '../constants/instrument_alerts.js'
import type {
  InstrumentAlertDecision,
  InstrumentAlertRuleRow,
  InstrumentAlertRuleSpec,
  InstrumentAlertSample,
  InstrumentAlertTransition,
} from '../types/instruments.js'
import type { JsonValue } from '../types/notification.js'

/**
 * Évaluation des alertes (#993), pure : le serveur (listener) et le client
 * (`use_instrument_stream`, retour immédiat à bord) appliquent la même
 * logique, avec hystérésis — une règle ouverte ne se lève qu'une fois la
 * valeur revenue au-delà de `threshold ± hysteresis`.
 */
export function decideThreshold(
  rule: Pick<InstrumentAlertRuleSpec, 'operator' | 'threshold' | 'hysteresis'>,
  value: number,
  isOpen: boolean
): InstrumentAlertDecision {
  const lower = rule.operator === 'lt'
  const violated = lower ? value < rule.threshold : value > rule.threshold
  if (!isOpen) return violated ? 'open' : 'none'
  const recovered = lower
    ? value >= rule.threshold + rule.hysteresis
    : value <= rule.threshold - rule.hysteresis
  return recovered ? 'clear' : 'keep'
}

/** `{ state, message }` d'une alarme `notifications.*`, ou `null` si la forme est inattendue. */
export function readAlarm(
  valueJson: JsonValue | null
): { state: string; message: string | null } | null {
  if (valueJson === null || typeof valueJson !== 'object' || Array.isArray(valueJson)) return null
  const state = valueJson.state
  if (typeof state !== 'string') return null
  const message = valueJson.message
  return { state, message: typeof message === 'string' ? message : null }
}

export function decideAlarm(valueJson: JsonValue | null, isOpen: boolean): InstrumentAlertDecision {
  const alarm = readAlarm(valueJson)
  if (!alarm) return 'none'
  const violated = SIGNALK_ALARM_OPEN_STATES.includes(alarm.state)
  if (!isOpen) return violated ? 'open' : 'none'
  return violated ? 'keep' : 'clear'
}

/** Clé d'une alerte ouverte dans l'ensemble passé à `evaluateAlerts`. */
export function alertOpenKey(ruleKey: string, path: string): string {
  return `${ruleKey}|${path}`
}

/**
 * Compare chaque échantillon aux règles dont le motif l'accepte. `open` liste
 * les alertes déjà ouvertes (`alertOpenKey`). Ne renvoie que les décisions
 * utiles : `open`, `keep` (pour rafraîchir la dernière valeur) et `clear`.
 */
export function evaluateAlerts(input: {
  rules: readonly InstrumentAlertRuleSpec[]
  samples: readonly InstrumentAlertSample[]
  open: ReadonlySet<string>
}): InstrumentAlertTransition[] {
  const transitions: InstrumentAlertTransition[] = []
  for (const sample of input.samples) {
    for (const rule of input.rules) {
      if (!matchesCatalogPattern(rule.pathPattern, sample.path)) continue
      const isOpen = input.open.has(alertOpenKey(rule.key, sample.path))
      let decision: InstrumentAlertDecision
      let message: string | null = null
      if (rule.kind === 'signalk_alarm') {
        decision = decideAlarm(sample.valueJson, isOpen)
        message = readAlarm(sample.valueJson)?.message ?? readAlarm(sample.valueJson)?.state ?? null
      } else {
        if (typeof sample.value !== 'number' || !Number.isFinite(sample.value)) continue
        decision = decideThreshold(rule, sample.value, isOpen)
      }
      if (decision === 'none') continue
      transitions.push({
        ruleKey: rule.key,
        path: sample.path,
        decision,
        severity: rule.severity,
        value: sample.value,
        message,
      })
    }
  }
  return transitions
}

const KNOT_PER_MS = 3600 / 1852

const TO_SI: Record<string, (value: number) => number> = {
  'kn': (v) => v / KNOT_PER_MS,
  '°C': (v) => v + 273.15,
  '°': (v) => (v * Math.PI) / 180,
  '%': (v) => v / 100,
  'bar': (v) => v * 100_000,
  'hPa': (v) => v * 100,
  'h': (v) => v * 3600,
  'rpm': (v) => v / 60,
  'L': (v) => v / 1000,
  'L/h': (v) => v / 3_600_000,
}

/** Unité d'affichage → SI (l'inverse de `toDisplayUnit` côté client). */
export function displayToSi(displayUnit: string | null, value: number): number {
  if (displayUnit === null) return value
  return (TO_SI[displayUnit] ?? ((raw: number) => raw))(value)
}

/** Une marge saisie dans l'unité d'affichage est un écart : on la convertit autour du seuil. */
export function hysteresisToSi(
  displayUnit: string | null,
  thresholdDisplay: number,
  hysteresisDisplay: number
): number {
  return Math.abs(
    displayToSi(displayUnit, thresholdDisplay + hysteresisDisplay) -
      displayToSi(displayUnit, thresholdDisplay)
  )
}

/** Règles intégrées + règles actives de l'admin, prêtes pour `evaluateAlerts` (côté client). */
export function alertRuleSpecs(rows: readonly InstrumentAlertRuleRow[]): InstrumentAlertRuleSpec[] {
  return [
    ...BUILTIN_ALERT_RULES,
    ...rows
      .filter((row) => row.enabled)
      .map(
        (row): InstrumentAlertRuleSpec => ({
          key: `rule:${row.id}`,
          pathPattern: row.path,
          kind: 'threshold',
          operator: row.operator,
          threshold: row.threshold,
          hysteresis: row.hysteresis,
          severity: row.severity,
        })
      ),
  ]
}
