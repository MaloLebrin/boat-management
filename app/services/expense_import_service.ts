import {
  CSV_IMPORT_INSERT_CHUNK,
  CSV_IMPORT_MAX_ROWS,
  EXPENSE_CATEGORY_ALIASES,
  EXPENSE_HEADER_ALIASES,
  IMPORT_DATE_FORMATS_HINT,
} from '#shared/constants/csv_import'
import { BUDGET_ENTRY_CATEGORIES, type BudgetEntryCategory } from '#shared/types/budget'
import {
  EXPENSE_CSV_HEADERS,
  EXPENSE_CSV_REQUIRED_HEADERS,
  type CsvImportPreviewResult,
  type CsvRowErrorKey,
  type ExpenseCsvHeader,
  type ExpenseImportRow,
  type ExpenseParseResult,
  type ParsedTable,
} from '#shared/types/csv'
import BoatBudgetEntry from '#models/boat_budget_entry'
import { normalizeImportToken } from '#services/table_file_parser_service'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

/** Longueur de `boat_budget_entries.label` (varchar 255). */
const LABEL_MAX_LENGTH = 255

/** Borne de `decimal(10,2)` : huit chiffres avant la virgule. */
const AMOUNT_ABS_MAX = 1e8

/**
 * Ramène les en-têtes du fichier aux clés canoniques via les alias FR/EN.
 * Une colonne inconnue vaut `null` et est ignorée ; la première colonne qui
 * correspond à une clé la prend, les suivantes sont ignorées aussi.
 */
export function resolveExpenseHeaders(headers: string[]): {
  canonical: (ExpenseCsvHeader | null)[]
  missingHeaders: ExpenseCsvHeader[]
} {
  const taken = new Set<ExpenseCsvHeader>()
  const canonical = headers.map((header) => {
    const token = normalizeImportToken(header)
    for (const key of EXPENSE_CSV_HEADERS) {
      if (!taken.has(key) && EXPENSE_HEADER_ALIASES[key].includes(token)) {
        taken.add(key)
        return key
      }
    }
    return null
  })
  const missingHeaders = EXPENSE_CSV_REQUIRED_HEADERS.filter((key) => !taken.has(key))
  return { canonical, missingHeaders }
}

/**
 * `YYYY-MM-DD`, `DD/MM/YYYY` ou `DD-MM-YYYY` → ISO ; `null` si la chaîne ne
 * correspond à aucun format ou si la date n'existe pas (`31/02/2024`). Les
 * cellules Date d'un classeur arrivent déjà en ISO (`cellToString`).
 */
export function parseImportDate(value: string): string | null {
  const trimmed = value.trim()
  let dt: DateTime | null = null

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    dt = DateTime.fromISO(trimmed)
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    dt = DateTime.fromFormat(trimmed, 'd/M/yyyy')
  } else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
    dt = DateTime.fromFormat(trimmed, 'd-M-yyyy')
  }

  return dt?.isValid ? dt.toISODate() : null
}

/**
 * Montant saisi à la française ou à l'anglaise : `1 234,56`, `1234.56`,
 * `1.234,56`, `1 234,56 €`, `-45`. Quand virgule et point coexistent, le
 * dernier des deux est le séparateur décimal. Arrondi au centime ; `null`
 * hors bornes de `decimal(10,2)` ou si rien de numérique n'en sort.
 */
export function parseImportAmount(value: string): number | null {
  let cleaned = value
    .replace(/€|eur/gi, '')
    .replace(/[\s  ']/g, '')
    .trim()
  if (cleaned === '') return null

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  if (lastComma !== -1 && lastDot !== -1) {
    cleaned =
      lastComma > lastDot ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/,/g, '')
  } else if (lastComma !== -1) {
    cleaned = cleaned.split(',').length > 2 ? cleaned.replace(/,/g, '') : cleaned.replace(',', '.')
  } else if (cleaned.split('.').length > 2) {
    cleaned = cleaned.replace(/\./g, '')
  }

  if (!/^[-+]?\d+(\.\d+)?$/.test(cleaned)) return null
  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed) || Math.abs(parsed) >= AMOUNT_ABS_MAX) return null
  return Math.round(parsed * 100) / 100
}

/** Vide → `other` ; slug ou alias FR/EN → slug ; inconnu → `null`. */
export function resolveExpenseCategory(value: string): BudgetEntryCategory | null {
  const token = normalizeImportToken(value)
  if (token === '') return 'other'
  return EXPENSE_CATEGORY_ALIASES[token] ?? null
}

export function validateExpenseRow(raw: Record<string, string>): {
  errors: CsvRowErrorKey[]
  row: ExpenseImportRow | null
} {
  const errors: CsvRowErrorKey[] = []

  const date = parseImportDate(raw['date'] ?? '')
  if (date === null) {
    errors.push({
      column: 'date',
      key: 'flash.csv.rowErrors.dateInvalidFormatFlexible',
      params: { formats: IMPORT_DATE_FORMATS_HINT },
    })
  }

  const label = (raw['label'] ?? '').trim()
  if (label === '') {
    errors.push({ column: 'label', key: 'flash.csv.rowErrors.labelRequired' })
  } else if (label.length > LABEL_MAX_LENGTH) {
    errors.push({
      column: 'label',
      key: 'flash.csv.rowErrors.labelTooLong',
      params: { max: String(LABEL_MAX_LENGTH) },
    })
  }

  const rawAmount = (raw['amount'] ?? '').trim()
  const amount = rawAmount === '' ? null : parseImportAmount(rawAmount)
  if (rawAmount === '') {
    errors.push({ column: 'amount', key: 'flash.csv.rowErrors.amountRequired' })
  } else if (amount === null) {
    errors.push({ column: 'amount', key: 'flash.csv.rowErrors.amountInvalid' })
  }

  const category = resolveExpenseCategory(raw['category'] ?? '')
  if (category === null) {
    errors.push({
      column: 'category',
      key: 'flash.csv.rowErrors.categoryInvalid',
      params: { values: BUDGET_ENTRY_CATEGORIES.join(', ') },
    })
  }

  if (errors.length > 0 || date === null || amount === null || category === null) {
    return { errors, row: null }
  }

  return {
    errors,
    row: {
      date,
      label,
      amount,
      category,
      description: (raw['description'] ?? '').trim() || null,
    },
  }
}

/**
 * Même squelette que `parseMaintenanceTable` : plafond de lignes d'abord,
 * puis en-têtes, puis validation ligne à ligne. Les doublons sont marqués
 * ensuite par `markExpenseDuplicates`, qui a besoin de la base.
 */
export function parseExpenseTable(table: ParsedTable): ExpenseParseResult {
  const { headers, rows } = table

  if (rows.length > CSV_IMPORT_MAX_ROWS) {
    return {
      previewRows: [],
      validRows: [],
      parsed: [],
      totalRows: rows.length,
      missingHeaders: [],
      tooManyRows: true,
    }
  }

  const { canonical, missingHeaders } = resolveExpenseHeaders(headers)
  const previewRows: ExpenseParseResult['previewRows'] = []
  const validRows: ExpenseImportRow[] = []
  const parsed: (ExpenseImportRow | null)[] = []

  for (const [i, cells] of rows.entries()) {
    const raw: Record<string, string> = {}
    for (const [j, key] of canonical.entries()) {
      if (key !== null) raw[key] = cells[j] ?? ''
    }

    const { errors, row } =
      missingHeaders.length === 0 ? validateExpenseRow(raw) : { errors: [], row: null }
    previewRows.push({
      line: i + 2,
      raw,
      errors,
      status: errors.length === 0 ? 'valid' : 'invalid',
    })
    parsed.push(row)
    if (row) validRows.push(row)
  }

  return {
    previewRows,
    validRows,
    parsed,
    totalRows: rows.length,
    missingHeaders,
    tooManyRows: false,
  }
}

/** Clé de doublon : même jour, même libellé (casse ignorée), même montant. */
export function expenseDuplicateKey(date: string, label: string, amount: number): string {
  return `${date}|${label.trim().toLowerCase()}|${amount.toFixed(2)}`
}

/**
 * Marque `duplicate` les lignes déjà présentes sur le bateau, et la seconde
 * occurrence d'une ligne répétée dans le fichier. Une seule requête : les
 * dépenses existantes aux dates concernées (au plus 2 000 dates distinctes).
 */
export async function markExpenseDuplicates(
  boatId: number,
  result: ExpenseParseResult
): Promise<CsvImportPreviewResult> {
  const { previewRows, parsed, totalRows, missingHeaders, tooManyRows } = result
  const dates = [...new Set(parsed.flatMap((row) => (row ? [row.date] : [])))]

  const seen = new Set<string>()
  if (dates.length > 0) {
    const existing = await BoatBudgetEntry.query()
      .select('date', 'label', 'amount')
      .where('boat_id', boatId)
      .whereIn('date', dates)
    for (const entry of existing) {
      const isoDate = entry.date.toISODate()
      if (isoDate) seen.add(expenseDuplicateKey(isoDate, entry.label, Number(entry.amount)))
    }
  }

  const validRows: ExpenseImportRow[] = []
  let duplicateRows = 0
  for (const [index, row] of parsed.entries()) {
    if (!row) continue
    const key = expenseDuplicateKey(row.date, row.label, row.amount)
    if (seen.has(key)) {
      previewRows[index].status = 'duplicate'
      duplicateRows++
      continue
    }
    seen.add(key)
    validRows.push(row)
  }

  return { previewRows, validRows, totalRows, missingHeaders, tooManyRows, duplicateRows }
}

/**
 * Insertion par lots dans une transaction unique — miroir
 * d'`importMaintenanceRows` et de `BoatBudgetEntryService.create` (montant
 * stocké en chaîne, comme le renvoie la colonne `decimal`).
 */
export async function importExpenseRows(boatId: number, rows: ExpenseImportRow[]): Promise<void> {
  await db.transaction(async (trx) => {
    for (let start = 0; start < rows.length; start += CSV_IMPORT_INSERT_CHUNK) {
      const chunk = rows.slice(start, start + CSV_IMPORT_INSERT_CHUNK)
      await BoatBudgetEntry.createMany(
        chunk.map((row) => ({
          boatId,
          amount: String(row.amount),
          date: DateTime.fromISO(row.date),
          label: row.label,
          category: row.category,
          description: row.description,
        })),
        { client: trx }
      )
    }
  })
}
