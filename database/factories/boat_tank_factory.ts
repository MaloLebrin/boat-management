import BoatTank from '#models/boat_tank'
import Factory from '@adonisjs/lucid/factories'

/** Cuve (#1037). `boatId` est à fournir par `merge` ou la relation. */
export const BoatTankFactory = Factory.define(BoatTank, ({ faker }) => ({
  name: faker.helpers.arrayElement(['Gasoil', 'Eau douce']),
  type: 'fuel' as const,
  capacityL: faker.number.int({ min: 50, max: 500 }),
  instrumentKey: null,
})).build()
