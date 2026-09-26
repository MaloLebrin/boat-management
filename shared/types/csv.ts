import type { BudgetEntryCategory } from '#shared/types/budget'
import type { BooleanQuotaKey } from '#shared/types/plan'

/**
 * Types d'import acceptés par `/settings/import`. `maintenance` importe
 * l'historique d'entretien, `expenses` les dépenses libres du budget
 * (`boat_budget_entries`). La colonne `pending_imports.type` (varchar 32)
 * discrimine les lignes en attente.
 */
export const CSV_IMPORT_TYPES = ['maintenance', 'expenses'] as const
export type CsvImportType = (typeof CSV_IMPORT_TYPES)[number]

/**
 * Flag de `PlanQuotas` qui ouvre chaque type d'import. Les deux types ne
 * suivent pas le même palier : l'historique d'entretien est une reprise de
 * données réservée à Entreprise (#715), les dépenses se chargent dès Pro.
 * `QuotaService` et l'écran `/settings/import` s'appuient sur cette table —
 * un troisième type s'ajoute ici, pas dans un `if`.
 */
export const CSV_IMPORT_PLAN_FLAGS = {
  maintenance: 'canImport',
  expenses: 'canImportExpenses',
} as const satisfies Record<CsvImportType, BooleanQuotaKey>

export const MAINTENANCE_CSV_HEADERS = [
  'date',
  'title',
  'subject',
  'notes',
  'engine_caption',
  'sail_caption',
  'cost',
] as const

/**
 * En-têtes canoniques du type `expenses`. Contrairement à la maintenance, le
 * fichier peut les nommer autrement : `EXPENSE_HEADER_ALIASES`
 * (`shared/constants/csv_import.ts`) ramène « Libellé », « Montant »… à ces
 * clés.
 */
export const EXPENSE_CSV_HEADERS = ['date', 'label', 'amount', 'category', 'description'] as const
export type ExpenseCsvHeader = (typeof EXPENSE_CSV_HEADERS)[number]
export const EXPENSE_CSV_REQUIRED_HEADERS: readonly ExpenseCsvHeader[] = ['date', 'label', 'amount']

/**
 * Sortie commune des lecteurs CSV et xlsx : en-têtes en minuscules, cellules
 * en texte. Tout ce qui suit (validation, aperçu, doublons) ignore le format
 * d'origine.
 */
export interface ParsedTable {
  headers: string[]
  rows: string[][]
}

export interface CsvRowError {
  column: string
  message: string
}

export interface CsvRowErrorKey {
  column: string
  key: string
  params?: Record<string, string>
}

/**
 * `duplicate` : la ligne existe déjà sur ce bateau (ou plus haut dans le même
 * fichier). Elle n'est ni en erreur ni importée — l'aperçu la signale, le
 * `confirm` la saute.
 */
export type CsvPreviewRowStatus = 'valid' | 'invalid' | 'duplicate'

export interface CsvPreviewRow {
  line: number
  raw: Record<string, string>
  errors: CsvRowError[]
  status: CsvPreviewRowStatus
}

export interface CsvPreviewRowKeys {
  line: number
  raw: Record<string, string>
  errors: CsvRowErrorKey[]
  status: CsvPreviewRowStatus
}

export interface CsvImportPreviewData {
  type: CsvImportType
  boatId: number
  boatName: string
  totalRows: number
  validRows: number
  invalidRows: number
  duplicateRows: number
  rows: CsvPreviewRow[]
}

export interface CsvBoatOption {
  id: number
  name: string
}

export interface MaintenanceImportRow {
  performedAt: string
  title: string
  subject: string
  notes: string | null
  engineCaption: string | null
  sailCaption: string | null
  cost: number | null
}

export interface ExpenseImportRow {
  /** `YYYY-MM-DD` */
  date: string
  label: string
  amount: number
  category: BudgetEntryCategory
  description: string | null
}

export type CsvImportRow = MaintenanceImportRow | ExpenseImportRow
export type CsvImportRows = MaintenanceImportRow[] | ExpenseImportRow[]

export interface CsvParseResult<TRow> {
  previewRows: CsvPreviewRowKeys[]
  validRows: TRow[]
  totalRows: number
  missingHeaders: string[]
  /**
   * Le fichier dépasse `CSV_IMPORT_MAX_ROWS` (#774). Le parse s'arrête là :
   * inutile de valider des lignes qu'on refusera, et surtout inutile de les
   * garder en mémoire.
   */
  tooManyRows: boolean
}

/** Parse des dépenses avant détection des doublons — voir `markExpenseDuplicates`. */
export interface ExpenseParseResult extends CsvParseResult<ExpenseImportRow> {
  /** Aligné sur `previewRows` : la ligne validée, ou `null` si en erreur. */
  parsed: (ExpenseImportRow | null)[]
}

/** Résultat prêt pour le contrôleur, une fois les doublons marqués. */
export interface CsvImportPreviewResult extends CsvParseResult<CsvImportRow> {
  duplicateRows: number
}
