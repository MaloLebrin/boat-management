import BoatInstrumentSource from '#models/boat_instrument_source'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'

/**
 * Source Signal K d'un bateau (#988). `boatId` et `organizationId` sont à
 * fournir par `merge` : la factory ne devine pas l'organisation du bateau.
 * Sans jeton par défaut — `tokenEncrypted` attend une valeur chiffrée par
 * `DataEncryptionService`, pas une chaîne libre.
 */
export const BoatInstrumentSourceFactory = Factory.define(
  BoatInstrumentSource,
  ({ faker }: FactoryContextContract) => ({
    kind: 'signalk' as const,
    baseUrl: `http://${faker.internet.ipv4()}:3000`,
    tokenEncrypted: null,
    vesselContext: 'vessels.self',
    enabled: true,
    lastSeenAt: null,
    lastError: null,
  })
).build()
