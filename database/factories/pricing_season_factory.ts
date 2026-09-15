import PricingSeason from '#models/pricing_season'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { DateTime } from 'luxon'
import { BoatFactory } from '#database/factories/boat_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'

/**
 * Saison à tarif journalier fixe, valable sur toute la flotte (`boatId: null`)
 * pour le mois en cours. État `multiplier` pour une saison en coefficient.
 */
export const PricingSeasonFactory = Factory.define(
  PricingSeason,
  ({ faker }: FactoryContextContract) => ({
    boatId: null,
    name: faker.helpers.arrayElement(['Haute saison', 'Basse saison', 'Moyenne saison']),
    startsOn: DateTime.now().startOf('month'),
    endsOn: DateTime.now().endOf('month').startOf('day'),
    dailyPrice: '200.00',
    multiplier: null,
    priority: 1,
  })
)
  .state('multiplier', (season) => {
    season.dailyPrice = null
    season.multiplier = '1.500'
  })
  .relation('organization', () => OrganizationFactory)
  .relation('boat', () => BoatFactory)
  .build()
