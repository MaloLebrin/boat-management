import SimulatorLead from '#models/simulator_lead'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'

export const SimulatorLeadFactory = Factory.define(
  SimulatorLead,
  ({ faker }: FactoryContextContract) => ({
    email: faker.internet.email({ provider: 'example.com' }),
    boatType: faker.helpers.arrayElement(['motorboat', 'sailboat', 'catamaran', 'rib']),
    lengthM: faker.number.int({ min: 6, max: 20 }),
    hullWear: faker.helpers.arrayElement(['new', 'good', 'worn', 'to_replace']),
    engineWear:
      faker.helpers.maybe(() =>
        faker.helpers.arrayElement(['new', 'good', 'worn', 'to_replace'])
      ) ?? null,
    safetyWear: faker.helpers.arrayElement(['new', 'good', 'worn', 'to_replace']),
    riggingWear:
      faker.helpers.maybe(() =>
        faker.helpers.arrayElement(['new', 'good', 'worn', 'to_replace'])
      ) ?? null,
    winteringZone:
      faker.helpers.maybe(() => faker.helpers.arrayElement(['covered', 'outdoor', 'sea'])) ?? null,
    totalMin: faker.number.int({ min: 500, max: 3000 }),
    totalMax: faker.number.int({ min: 3000, max: 8000 }),
    locale: faker.helpers.arrayElement(['fr', 'en']),
  })
).build()
