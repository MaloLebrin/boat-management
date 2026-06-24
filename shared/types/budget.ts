export interface BudgetMonthlyData {
  month: number
  maintenance: number
  fuel: number
  documents: number
  total: number
}

export interface BudgetYearSummary {
  maintenance: number
  fuel: number
  documents: number
  total: number
}

export interface BudgetData {
  year: number
  monthly: BudgetMonthlyData[]
  totals: BudgetYearSummary
  previousYearTotals: BudgetYearSummary | null
}

export interface MonthRow {
  month: number
  total: string | null
}
