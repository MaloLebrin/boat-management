import { TableFileUnreadableError } from '#exceptions/csv_errors'
import type { ParsedTable } from '#shared/types/csv'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import ExcelJS from 'exceljs'
import { DateTime } from 'luxon'
import { promises as fs } from 'node:fs'

/**
 * Lecture d'un fichier tabulaire uploadé — CSV ou classeur Excel — vers une
 * table de texte unique (`ParsedTable`). C'est le **seul** module qui importe
 * `exceljs` : `shared/` et `inertia/` ne doivent jamais le faire, sinon Vite
 * embarque la bibliothèque dans le bundle client.
 */

/**
 * Normalise un jeton pour la comparaison d'en-têtes et de catégories : trim,
 * BOM retiré, accents supprimés (décomposition NFD), minuscules, espaces
 * internes réduits à un. « Libellé » et « libelle » deviennent identiques.
 */
export function normalizeImportToken(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

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

/** CSV séparé par `;`, guillemets doublés, BOM UTF-8 toléré. */
export function parseCsvContent(content: string): ParsedTable {
  const cleaned = content.startsWith('\uFEFF') ? content.slice(1) : content
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase())
  const rows = lines.slice(1).map((l) => splitCsvLine(l))
  return { headers, rows }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Rend une cellule Excel sous la forme texte qu'aurait un CSV. Les dates
 * sortent en `YYYY-MM-DD` : exceljs construit ses `Date` en UTC, d'où le
 * `zone: 'utc'` — sans lui, un serveur à l'ouest de Greenwich reculerait
 * chaque date d'un jour.
 */
export function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) {
    return DateTime.fromJSDate(value, { zone: 'utc' }).toISODate() ?? ''
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'string') return value.trim()

  if (isRecord(value)) {
    if ('richText' in value && Array.isArray(value.richText)) {
      return (value.richText as ExcelJS.RichText[])
        .map((part) => part.text)
        .join('')
        .trim()
    }
    if ('formula' in value || 'sharedFormula' in value) {
      const result = (value as ExcelJS.CellFormulaValue).result
      return result === undefined ? '' : cellToString(result as ExcelJS.CellValue)
    }
    if ('hyperlink' in value && typeof value.text === 'string') return value.text.trim()
    if ('error' in value) return ''
  }

  return String(value).trim()
}

/**
 * Première feuille du classeur, ligne 1 = en-têtes, lignes suivantes = données.
 * Les lignes entièrement vides sont ignorées, comme les lignes blanches d'un
 * CSV. Le plafond de lignes reste appliqué par les parseurs métier.
 */
export async function parseXlsxBuffer(buffer: Buffer): Promise<ParsedTable> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)

  const sheet = workbook.worksheets[0]
  if (!sheet || sheet.rowCount === 0) return { headers: [], rows: [] }

  const headerRow = sheet.getRow(1)
  const columnCount = Math.max(headerRow.cellCount, sheet.columnCount)
  const headers: string[] = []
  for (let c = 1; c <= columnCount; c++) {
    headers.push(cellToString(headerRow.getCell(c).value).toLowerCase())
  }
  while (headers.length > 0 && headers[headers.length - 1] === '') headers.pop()
  if (headers.length === 0) return { headers: [], rows: [] }

  const rows: string[][] = []
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r)
    const cells = headers.map((_, index) => cellToString(row.getCell(index + 1).value))
    if (cells.every((cell) => cell === '')) continue
    rows.push(cells)
  }

  return { headers, rows }
}

/**
 * Point d'entrée du contrôleur : lit le fichier temporaire selon son
 * extension. Toute erreur de lecture d'un classeur (zip corrompu, CSV renommé
 * en `.xlsx`) devient `TableFileUnreadableError`.
 */
export async function parseUploadedTable(file: MultipartFile): Promise<ParsedTable> {
  const path = file.tmpPath
  if (!path) throw new TableFileUnreadableError()

  if (file.extname?.toLowerCase() === 'xlsx') {
    try {
      return await parseXlsxBuffer(await fs.readFile(path))
    } catch (error) {
      throw new TableFileUnreadableError(error)
    }
  }

  return parseCsvContent(await fs.readFile(path, 'utf-8'))
}
