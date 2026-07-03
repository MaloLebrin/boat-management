import type {
  CsvImportType,
  CsvPreviewRowKeys,
  CsvRowErrorKey,
  MaintenanceImportRow,
} from '#shared/types/csv'
import { MAINTENANCE_CSV_HEADERS } from '#shared/types/csv'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import BoatMaintenancePart from '#models/boat_maintenance_part'
import db from '@adonisjs/lucid/services/db'
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

export { MAINTENANCE_CSV_HEADERS }

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ';' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function parseCsvContent(content: string): { headers: string[]; rows: string[][] } {
  const cleaned = content.startsWith('﻿') ? content.slice(1) : content
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase())
  const rows = lines.slice(1).map((l) => splitCsvLine(l))
  return { headers, rows }
}

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

export interface CsvParseResult {
  previewRows: CsvPreviewRowKeys[]
  validRows: MaintenanceImportRow[]
  totalRows: number
  missingHeaders: string[]
}

export function parseMaintenanceCsv(content: string, _type: CsvImportType): CsvParseResult {
  const { headers, rows } = parseCsvContent(content)

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
    previewRows.push({ line: i + 2, raw, errors })

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

  return { previewRows, validRows, totalRows: rows.length, missingHeaders }
}

export async function importMaintenanceRows(boatId: number, rows: MaintenanceImportRow[]) {
  return await db.transaction(async (trx) => {
    for (const row of rows) {
      const event = await BoatMaintenanceEvent.create(
        {
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
        },
        { client: trx }
      )

      if (row.cost !== null) {
        await BoatMaintenancePart.create(
          {
            maintenanceEventId: event.id,
            name: 'Coût total',
            quantity: 1,
            unitPrice: String(row.cost),
            notes: null,
            enginePartId: null,
          },
          { client: trx }
        )
      }
    }
  })
}
