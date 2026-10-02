export const BUDGET_ENTRY_CATEGORIES = [
  'maintenance',
  'fuel',
  'documents',
  'port',
  'equipment',
  'other',
] as const
export type BudgetEntryCategory = (typeof BUDGET_ENTRY_CATEGORIES)[number]

export interface BudgetMonthlyData {
  month: number
  maintenance: number
  fuel: number
  documents: number
  port: number
  equipment: number
  entries: number
  total: number
}

export interface BudgetYearSummary {
  maintenance: number
  fuel: number
  documents: number
  port: number
  equipment: number
  entries: number
  total: number
}

/**
 * Entretien prévu (#868) : somme des coûts estimés des tâches ouvertes dues
 * d'ici la fin du trimestre civil courant, retards compris — ils restent à
 * payer. `unestimatedCount` : tâches de la même fenêtre sans estimation, que
 * la somme ne couvre donc pas.
 */
export interface PlannedMaintenanceSummary {
  year: number
  quarter: number
  amount: number
  estimatedCount: number
  unestimatedCount: number
}

export interface BudgetData {
  year: number
  monthly: BudgetMonthlyData[]
  totals: BudgetYearSummary
  previousYearTotals: BudgetYearSummary | null
}

export interface BoatPortStayItem {
  id: number
  portName: string
  startedAt: string
  endedAt: string | null
  cost: number | null
  notes: string | null
}

export interface BoatBudgetEntryItem {
  id: number
  amount: number
  date: string
  label: string
  category: BudgetEntryCategory | 'other'
  description: string | null
  /** Partagée avec le propriétaire dans son portail (#890). */
  visibleToOwner: boolean
}
