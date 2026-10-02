import { inject } from '@adonisjs/core'
import type { DateTime } from 'luxon'
import BoatBudgetEntry from '#models/boat_budget_entry'
import type Boat from '#models/boat'
import type { BudgetEntryCategory } from '#shared/types/budget'

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
      visibleToOwner?: boolean
    }
  ): Promise<BoatBudgetEntry> {
    return BoatBudgetEntry.create({
      boatId: boat.id,
      amount: String(data.amount),
      date: data.date,
      label: data.label,
      category: data.category ?? 'other',
      description: data.description ?? null,
      visibleToOwner: data.visibleToOwner ?? false,
    })
  }

  async update(
    boat: Boat,
    entryId: number,
    data: {
      amount: number
      date: DateTime
      label: string
      category?: BudgetEntryCategory | null
      description?: string | null
      visibleToOwner?: boolean
    }
  ): Promise<void> {
    const entry = await BoatBudgetEntry.query()
      .where('id', entryId)
      .where('boat_id', boat.id)
      .firstOrFail()

    entry.merge({
      amount: String(data.amount),
      date: data.date,
      label: data.label,
      category: data.category ?? 'other',
      description: data.description ?? null,
    })
    // Le formulaire d'édition peut ne pas porter la case : l'absence n'efface rien.
    if (data.visibleToOwner !== undefined) entry.visibleToOwner = data.visibleToOwner
    await entry.save()
  }

  async delete(boat: Boat, entryId: number): Promise<void> {
    await BoatBudgetEntry.query().where('id', entryId).where('boat_id', boat.id).delete()
  }
}
