import BoatTelemetrySample from '#models/boat_telemetry_sample'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { DateTime } from 'luxon'

/**
 * Échantillon numérique (#988). `boatId` et `sourceId` sont à fournir par
 * `merge` ; `path` est un chemin de la liste blanche, `value` une chaîne
 * comme toute colonne `numeric` sous Lucid.
 */
export const BoatTelemetrySampleFactory = Factory.define(
  BoatTelemetrySample,
  ({ faker }: FactoryContextContract) => ({
    path: 'navigation.speedOverGround',
    recordedAt: DateTime.fromJSDate(faker.date.recent({ days: 1 })),
    value: String(faker.number.float({ min: 0, max: 12, fractionDigits: 3 })),
    valueJson: null,
  })
).build()
