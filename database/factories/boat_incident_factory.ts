import BoatIncident from '#models/boat_incident'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { DateTime } from 'luxon'
import { BoatFactory } from '#database/factories/boat_factory'

/** Incident ouvert par défaut ; état `closed` pour un incident clôturé. */
export const BoatIncidentFactory = Factory.define(
  BoatIncident,
  ({ faker }: FactoryContextContract) => ({
    type: 'engine_failure',
    status: 'open',
    occurredAt: DateTime.now().minus({ days: 1 }),
    location: faker.location.city(),
    description: faker.lorem.sentence(),
    insuranceClaimed: false,
    insuranceClaimRef: null,
    closedAt: null,
  })
)
  .state('closed', (incident) => {
    incident.status = 'closed'
    incident.closedAt = DateTime.now()
  })
  .relation('boat', () => BoatFactory)
  .build()
