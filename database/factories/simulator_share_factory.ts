import SimulatorShare from '#models/simulator_share'
import type { SimulatorBoatInput, SimulatorCostBreakdown } from '#shared/types/simulator'
import { SIMULATOR_SHARE_LIFETIME_DAYS } from '#shared/constants/data_retention'
import Factory from '@adonisjs/lucid/factories'
import { DateTime } from 'luxon'
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
      token: faker.string.alphanumeric(32),
      input,
      breakdown,
      locale: faker.helpers.arrayElement(['fr', 'en']),
      // Un partage de fabrique est **vivant** par défaut (#775) : les tests
      // qui l'utilisent exercent la page de lecture, pas l'expiration.
      // `.merge({ expiresAt })` sert le cas inverse.
      expiresAt: DateTime.now().plus({ days: SIMULATOR_SHARE_LIFETIME_DAYS }),
    }
  }
).build()
