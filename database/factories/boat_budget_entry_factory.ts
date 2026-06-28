import BoatBudgetEntry from '#models/boat_budget_entry'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { DateTime } from 'luxon'
import { BUDGET_ENTRY_CATEGORIES } from '#shared/types/budget'

export const BoatBudgetEntryFactory = Factory.define(
  BoatBudgetEntry,
  ({ faker }: FactoryContextContract) => {
    return {
      amount: String(faker.number.float({ min: 10, max: 2000, fractionDigits: 2 })),
      date: DateTime.fromJSDate(faker.date.past({ years: 2 })),
      label: faker.lorem.words(3),
      category: faker.helpers.arrayElement([...BUDGET_ENTRY_CATEGORIES]),
      description: null,
    }
  }
).build()
