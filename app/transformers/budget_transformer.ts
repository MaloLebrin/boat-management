import type BoatBudgetEntry from '#models/boat_budget_entry'
import type BoatPortStay from '#models/boat_port_stay'
import type { BoatBudgetEntryItem, BoatPortStayItem } from '#shared/types/budget'

export function toBudgetEntryItem(entry: BoatBudgetEntry): BoatBudgetEntryItem {
  return {
    id: entry.id,
    amount: Number.parseFloat(entry.amount),
    date: entry.date.toISODate()!,
    label: entry.label,
    category: entry.category as BoatBudgetEntryItem['category'],
    description: entry.description,
  }
}

export function toPortStayItem(stay: BoatPortStay): BoatPortStayItem {
  return {
    id: stay.id,
    portName: stay.portName,
    startedAt: stay.startedAt.toISODate()!,
    endedAt: stay.endedAt?.toISODate() ?? null,
    cost: stay.cost !== null ? Number.parseFloat(stay.cost) : null,
    notes: stay.notes,
  }
}
