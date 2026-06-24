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

export interface BudgetCsvRow {
  month: string
  maintenance: number
  fuel: number
  documents: number
  total: number
}
