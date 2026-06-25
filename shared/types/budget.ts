export interface BudgetMonthlyData {
  month: number
  maintenance: number
  fuel: number
  documents: number
  port: number
  equipment: number
  total: number
}

export interface BudgetYearSummary {
  maintenance: number
  fuel: number
  documents: number
  port: number
  equipment: number
  total: number
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
  cost: string | null
  notes: string | null
}
