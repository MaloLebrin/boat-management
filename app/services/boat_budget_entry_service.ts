import { inject } from '@adonisjs/core'
import type { DateTime } from 'luxon'
import BoatBudgetEntry from '#models/boat_budget_entry'
import type Boat from '#models/boat'
import type { BudgetEntryCategory } from '#validators/budget_entry_validator'

@inject()
export default class BoatBudgetEntryService {
  async listForBoat(boat: Boat, year?: number): Promise<BoatBudgetEntry[]> {
    const query = BoatBudgetEntry.query().where('boat_id', boat.id).orderBy('date', 'desc')
    if (year) {
      query.whereRaw('EXTRACT(YEAR FROM date) = ?', [year])
    }
    return query
  }

  async create(
    boat: Boat,
    data: {
      amount: number
      date: DateTime
      label: string
      category?: BudgetEntryCategory | null
      description?: string | null
    }
  ): Promise<BoatBudgetEntry> {
    return BoatBudgetEntry.create({
      boatId: boat.id,
      amount: String(data.amount),
      date: data.date,
      label: data.label,
      category: data.category ?? 'other',
      description: data.description ?? null,
    })
  }

  async delete(boat: Boat, entryId: number): Promise<void> {
    await BoatBudgetEntry.query().where('id', entryId).where('boat_id', boat.id).delete()
  }
}
