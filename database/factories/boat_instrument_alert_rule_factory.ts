import BoatInstrumentAlertRule from '#models/boat_instrument_alert_rule'
import Factory from '@adonisjs/lucid/factories'

/** Règle de seuil (#993). `boatId` et `organizationId` sont à fournir par `merge`. */
export const BoatInstrumentAlertRuleFactory = Factory.define(BoatInstrumentAlertRule, () => ({
  path: 'electrical.batteries.house.voltage',
  operator: 'lt' as const,
  threshold: '12.0000',
  hysteresis: '0.5000',
  severity: 'warning' as const,
  enabled: true,
})).build()
