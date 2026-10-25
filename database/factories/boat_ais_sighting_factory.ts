import BoatAisSighting from '#models/boat_ais_sighting'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { DateTime } from 'luxon'

/**
 * Relevé AIS (#1009). `boatId` et `sourceId` sont à fournir par `merge` ;
 * `mmsi` est un numéro à 9 chiffres.
 */
export const BoatAisSightingFactory = Factory.define(
  BoatAisSighting,
  ({ faker }: FactoryContextContract) => ({
    mmsi: String(Math.floor(100_000_000 + faker.number.int({ min: 0, max: 899_999_999 }))),
    recordedAt: DateTime.fromJSDate(faker.date.recent({ days: 1 })),
    name: faker.company.name().slice(0, 20).toUpperCase(),
    // DECIMAL columns are typed as string in Lucid's schema generator.
    latitude: String(faker.location.latitude()),
    longitude: String(faker.location.longitude()),
    sogMs: String(faker.number.float({ min: 0, max: 20, fractionDigits: 2 })),
    cogRad: String(faker.number.float({ min: 0, max: 6.28, fractionDigits: 3 })),
    shipType: 70,
    shipTypeName: 'Cargo',
    cpaM: null,
    tcpaS: null,
  })
).build()
