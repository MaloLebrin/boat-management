import NavigationLog from '#models/navigation_log'
import Factory from '@adonisjs/lucid/factories'
import { DateTime } from 'luxon'

export const NavigationLogFactory = Factory.define(NavigationLog, () => ({
  status: 'in_progress' as const,
  departedAt: DateTime.now().minus({ hours: 5 }),
  arrivedAt: null,
  departurePortId: null,
  departurePortName: null,
  arrivalPortId: null,
  arrivalPortName: null,
  distanceNm: null,
  engineHoursStart: null,
  engineHoursEnd: null,
  fuelConsumedLiters: null,
  windForceBeaufort: null,
  seaState: null,
  crewCount: null,
  notes: null,
})).build()
