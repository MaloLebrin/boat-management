import SimulatorShare from '#models/simulator_share'
import type { SimulatorBoatInput, SimulatorCostBreakdown } from '#shared/types/simulator'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'

export const SimulatorShareFactory = Factory.define(
  SimulatorShare,
  ({ faker }: FactoryContextContract) => {
    const input: SimulatorBoatInput = {
      boatType: faker.helpers.arrayElement(['motorboat', 'sailboat', 'catamaran', 'rib']),
      lengthM: faker.number.float({ min: 6, max: 20, fractionDigits: 1 }),
      yearBuilt: faker.number.int({ min: 1990, max: 2020 }),
      navigationCategory: 'B',
      hasDedicatedEngine: true,
      hullWear: 'good',
      engineWear: 'good',
      safetyWear: 'good',
      riggingWear: null,
    }

    const breakdown: SimulatorCostBreakdown = {
      categories: [],
      totalMin: faker.number.int({ min: 500, max: 3000 }),
      totalMax: faker.number.int({ min: 3000, max: 8000 }),
    }

    return {
      token: faker.string.uuid(),
      input,
      breakdown,
      locale: faker.helpers.arrayElement(['fr', 'en']),
    }
  }
).build()
