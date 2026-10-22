import type { InstrumentAlertRuleSpec } from '../types/instruments.js'

/** Règles administrables par bateau (#993). */
export const INSTRUMENT_ALERT_MAX_RULES_PER_BOAT = 20

/** États Signal K d'une alarme qui ouvrent une alerte. */
export const SIGNALK_ALARM_OPEN_STATES: readonly string[] = ['alarm', 'emergency']

/**
 * Règles intégrées (#993) : évaluées sur tous les bateaux équipés, sans
 * configuration. Seuils et marges en unités SI (D8).
 */
export const BUILTIN_ALERT_RULES: readonly InstrumentAlertRuleSpec[] = [
  {
    key: 'builtin:battery_low',
    pathPattern: 'electrical.batteries.<id>.capacity.stateOfCharge',
    kind: 'threshold',
    operator: 'lt',
    threshold: 0.2,
    hysteresis: 0.05,
    severity: 'warning',
  },
  {
    key: 'builtin:engine_hot',
    pathPattern: 'propulsion.<id>.coolantTemperature',
    kind: 'threshold',
    operator: 'gt',
    threshold: 368.15,
    hysteresis: 5,
    severity: 'critical',
  },
  {
    key: 'builtin:shallow_water',
    pathPattern: 'environment.depth.belowKeel',
    kind: 'threshold',
    operator: 'lt',
    threshold: 1.5,
    hysteresis: 0.5,
    severity: 'critical',
  },
  {
    key: 'builtin:signalk_alarm',
    pathPattern: 'notifications.<path>',
    kind: 'signalk_alarm',
    operator: 'gt',
    threshold: 0,
    hysteresis: 0,
    severity: 'critical',
  },
]
