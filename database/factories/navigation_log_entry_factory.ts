import NavigationLogEntry from '#models/navigation_log_entry'
import Factory from '@adonisjs/lucid/factories'
import { DateTime } from 'luxon'

export const NavigationLogEntryFactory = Factory.define(NavigationLogEntry, () => ({
  recordedAt: DateTime.now().minus({ hours: 1 }),
  latitude: '47.273000',
  longitude: '-2.213000',
  gpsAccuracyM: '8.0',
  cogDeg: 215,
  sogKn: '5.40',
  sailConfig: null,
  note: null,
  twdDeg: null,
  twaDeg: null,
  weatherSnapshot: null,
})).build()
