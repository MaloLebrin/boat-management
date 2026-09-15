import BoatInspection from '#models/boat_inspection'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { DateTime } from 'luxon'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'

/**
 * État des lieux de départ (`checkout`) par défaut ; état `checkin` pour le
 * retour. `organizationId` et `reservationId` sont à fournir via `merge()` —
 * ils doivent pointer sur la même organisation que le bateau réservé.
 */
export const BoatInspectionFactory = Factory.define(
  BoatInspection,
  ({ faker }: FactoryContextContract) => ({
    kind: 'checkout',
    performedAt: DateTime.now().minus({ hours: 1 }),
    fuelLevel: faker.number.int({ min: 0, max: 100 }),
    engineHours: null,
    notes: null,
  })
)
  .state('checkin', (inspection) => {
    inspection.kind = 'checkin'
  })
  .relation('reservation', () => BoatReservationFactory)
  .build()
