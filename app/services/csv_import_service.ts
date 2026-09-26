import { CSV_IMPORT_INSERT_CHUNK, CSV_IMPORT_MAX_ROWS } from '#shared/constants/csv_import'
import type {
  CsvImportPreviewResult,
  CsvImportRows,
  CsvImportType,
  CsvParseResult,
  CsvPreviewRowKeys,
  CsvRowErrorKey,
  ExpenseImportRow,
  MaintenanceImportRow,
  ParsedTable,
} from '#shared/types/csv'
import { MAINTENANCE_CSV_HEADERS } from '#shared/types/csv'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import BoatMaintenancePart from '#models/boat_maintenance_part'
import {
  importExpenseRows,
  markExpenseDuplicates,
  parseExpenseTable,
} from '#services/expense_import_service'
import { parseCsvContent } from '#services/table_file_parser_service'
import db from '@adonisjs/lucid/services/db'
import type { I18n } from '@adonisjs/i18n'
import { DateTime } from 'luxon'

const VALID_SUBJECTS = [
  'boat',
  'hull',
  'engine',
  'sail',
  'rig',
  'electrical',
  'plumbing',
  'safety',
  'deck',
  'other',
] as const

export { MAINTENANCE_CSV_HEADERS, parseCsvContent }
export type { CsvParseResult }

function validateMaintenanceRow(raw: Record<string, string>): CsvRowErrorKey[] {
  const errors: CsvRowErrorKey[] = []

  if (!raw['date'] || !/^\d{4}-\d{2}-\d{2}$/.test(raw['date'])) {
    errors.push({ column: 'date', key: 'flash.csv.rowErrors.dateInvalidFormat' })
  } else {
    const dt = DateTime.fromISO(raw['date'])
    if (!dt.isValid) {
      errors.push({ column: 'date', key: 'flash.csv.rowErrors.dateInvalid' })
    }
  }

  if (!raw['title']?.trim()) {
    errors.push({ column: 'title', key: 'flash.csv.rowErrors.titleRequired' })
  }

  const subject = raw['subject']?.trim()
  if (!subject || !(VALID_SUBJECTS as readonly string[]).includes(subject)) {
    errors.push({
      column: 'subject',
      key: 'flash.csv.rowErrors.subjectInvalid',
      params: { values: VALID_SUBJECTS.join(', ') },
    })
  } else {
    if (subject === 'engine' && !raw['engine_caption']?.trim()) {
      errors.push({ column: 'engine_caption', key: 'flash.csv.rowErrors.engineCaptionRequired' })
    }
    if (subject === 'sail' && !raw['sail_caption']?.trim()) {
      errors.push({ column: 'sail_caption', key: 'flash.csv.rowErrors.sailCaptionRequired' })
    }
  }

  const cost = raw['cost']?.trim()
  if (cost && Number.isNaN(Number.parseFloat(cost.replace(',', '.')))) {
    errors.push({ column: 'cost', key: 'flash.csv.rowErrors.costInvalid' })
  }

  return errors
}

/**
 * Valide une table de maintenance (CSV ou xlsx déjà lu). Les en-têtes sont
 * **strictes** (`MAINTENANCE_CSV_HEADERS`), contrairement au type `expenses`
 * qui tolère des alias.
 */
export function parseMaintenanceTable(table: ParsedTable): CsvParseResult<MaintenanceImportRow> {
  const { headers, rows } = table

  // Refus avant validation (#774) : le parse ne bornait rien, et un fichier de
  // 5 Mo — ce que le validateur laissait passer — fait plusieurs dizaines de
  // milliers de lignes, toutes validées puis conservées.
  if (rows.length > CSV_IMPORT_MAX_ROWS) {
    return {
      previewRows: [],
      validRows: [],
      totalRows: rows.length,
      missingHeaders: [],
      tooManyRows: true,
    }
  }

  const requiredHeaders = MAINTENANCE_CSV_HEADERS.filter(
    (h) => !['notes', 'engine_caption', 'sail_caption', 'cost'].includes(h)
  )
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))

  const previewRows: CsvPreviewRowKeys[] = []
  const validRows: MaintenanceImportRow[] = []

  for (const [i, cells] of rows.entries()) {
    const raw: Record<string, string> = {}
    for (const [j, header] of headers.entries()) {
      raw[header] = cells[j] ?? ''
    }

    const errors = missingHeaders.length === 0 ? validateMaintenanceRow(raw) : []
    previewRows.push({
      line: i + 2,
      raw,
      errors,
      status: errors.length === 0 ? 'valid' : 'invalid',
    })

    if (errors.length === 0 && missingHeaders.length === 0) {
      const cost = raw['cost']?.trim() ? Number.parseFloat(raw['cost'].replace(',', '.')) : null
      validRows.push({
        performedAt: raw['date'],
        title: raw['title'].trim(),
        subject: raw['subject'].trim(),
        notes: raw['notes']?.trim() || null,
        engineCaption: raw['engine_caption']?.trim() || null,
        sailCaption: raw['sail_caption']?.trim() || null,
        cost: cost !== null && !Number.isNaN(cost) ? cost : null,
      })
    }
  }

  return { previewRows, validRows, totalRows: rows.length, missingHeaders, tooManyRows: false }
}

/** Raccourci historique : contenu CSV brut → table de maintenance validée. */
export function parseMaintenanceCsv(
  content: string,
  _type: CsvImportType
): CsvParseResult<MaintenanceImportRow> {
  return parseMaintenanceTable(parseCsvContent(content))
}

/**
 * Aiguillage du `preview` par type. Seul le type `expenses` connaît les
 * doublons ; la maintenance en compte toujours zéro.
 */
export async function prepareImportPreview(
  type: CsvImportType,
  table: ParsedTable,
  boatId: number
): Promise<CsvImportPreviewResult> {
  if (type === 'expenses') {
    return markExpenseDuplicates(boatId, parseExpenseTable(table))
  }
  return { ...parseMaintenanceTable(table), duplicateRows: 0 }
}

/**
 * Aiguillage du `confirm`. Les `rows` d'un `PendingImport` sont typées en
 * union : c'est la colonne `type`, écrite par le même `preview`, qui dit
 * laquelle des deux formes elles ont — d'où les casts.
 */
export async function runImport(
  type: CsvImportType,
  boatId: number,
  rows: CsvImportRows,
  i18n: I18n
): Promise<void> {
  if (type === 'expenses') {
    await importExpenseRows(boatId, rows as ExpenseImportRow[])
    return
  }
  await importMaintenanceRows(boatId, rows as MaintenanceImportRow[], i18n)
}

/**
 * Insère les lignes validées, **par lots** (#774).
 *
 * L'insertion se faisait ligne à ligne, à raison de deux `INSERT` par ligne :
 * un import de quelques milliers de lignes tenait un verrou long et gonflait
 * le WAL. Les lots de `CSV_IMPORT_INSERT_CHUNK` ramènent ça à deux `INSERT`
 * par lot.
 *
 * La transaction unique est **conservée** : le contrat documenté est un
 * rollback global si une ligne échoue, et le plafond de lignes borne
 * désormais sa durée.
 */
export async function importMaintenanceRows(
  boatId: number,
  rows: MaintenanceImportRow[],
  i18n: I18n
) {
  const totalCostLabel = i18n.t('maintenance.history.timeline.totalCost')

  return await db.transaction(async (trx) => {
    for (let start = 0; start < rows.length; start += CSV_IMPORT_INSERT_CHUNK) {
      const chunk = rows.slice(start, start + CSV_IMPORT_INSERT_CHUNK)

      const events = await BoatMaintenanceEvent.createMany(
        chunk.map((row) => ({
          boatId,
          subject: row.subject,
          performedAt: DateTime.fromISO(row.performedAt),
          title: row.title,
          notes: row.notes,
          engineCaption: row.engineCaption,
          sailCaption: row.sailCaption,
          boatEngineId: null,
          boatSailId: null,
          boatRigId: null,
          boatSafetyEquipmentId: null,
        })),
        { client: trx }
      )

      // `createMany` préserve l'ordre : l'événement d'indice i correspond à la
      // ligne d'indice i, ce dont dépend l'association du coût.
      const parts = chunk.flatMap((row, index) =>
        row.cost === null
          ? []
          : [
              {
                maintenanceEventId: events[index].id,
                name: totalCostLabel,
                quantity: 1,
                unitPrice: String(row.cost),
                notes: null,
                enginePartId: null,
              },
            ]
      )

      if (parts.length > 0) {
        await BoatMaintenancePart.createMany(parts, { client: trx })
      }
    }
  })
}
