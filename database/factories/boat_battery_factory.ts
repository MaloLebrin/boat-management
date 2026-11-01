import BoatBattery from '#models/boat_battery'
import Factory from '@adonisjs/lucid/factories'

/** Batterie (#1037). `boatId` est à fournir par `merge` ou la relation. */
export const BoatBatteryFactory = Factory.define(BoatBattery, ({ faker }) => ({
  name: faker.helpers.arrayElement(['Servitude', 'Démarrage', 'Propulseur']),
  chemistry: faker.helpers.arrayElement(['agm', 'lithium', 'lead_acid'] as const),
  capacityAh: faker.number.int({ min: 60, max: 400 }),
  nominalVoltage: '12.0',
  position: 0,
  instrumentKey: null,
})).build()
