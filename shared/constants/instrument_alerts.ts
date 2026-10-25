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
    key: 'builtin:fuel_low',
    pathPattern: 'tanks.fuel.<id>.currentLevel',
    kind: 'threshold',
    operator: 'lt',
    threshold: 0.15,
    hysteresis: 0.05,
    severity: 'warning',
  },
  {
    key: 'builtin:battery_voltage_low',
    pathPattern: 'electrical.batteries.<id>.voltage',
    kind: 'threshold',
    operator: 'lt',
    threshold: 11.8,
    hysteresis: 0.3,
    severity: 'warning',
  },
  {
    key: 'builtin:oil_pressure_low',
    pathPattern: 'propulsion.<id>.oilPressure',
    kind: 'threshold',
    operator: 'lt',
    threshold: 100_000,
    hysteresis: 30_000,
    severity: 'critical',
  },
  {
    // 3 500 tr/min (retour à 3 300) : `revolutions` est en hertz.
    key: 'builtin:engine_overrev',
    pathPattern: 'propulsion.<id>.revolutions',
    kind: 'threshold',
    operator: 'gt',
    threshold: 3500 / 60,
    hysteresis: 200 / 60,
    severity: 'warning',
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
