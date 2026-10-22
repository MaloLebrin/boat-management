import BoatInstrumentAlert from '#models/boat_instrument_alert'
import Factory from '@adonisjs/lucid/factories'
import { DateTime } from 'luxon'

/** Alerte ouverte (#993). `boatId`, `organizationId`, `ruleKey` et `path` sont à fournir par `merge`. */
export const BoatInstrumentAlertFactory = Factory.define(BoatInstrumentAlert, () => ({
  severity: 'warning' as const,
  openedAt: DateTime.now(),
  clearedAt: null,
  lastValue: null,
  message: null,
})).build()
