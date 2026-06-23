export type CsvImportType = 'maintenance'

export const MAINTENANCE_CSV_HEADERS = [
  'date',
  'title',
  'subject',
  'notes',
  'engine_caption',
  'sail_caption',
  'cost',
] as const

export interface CsvRowError {
  column: string
  message: string
}

export interface CsvPreviewRow {
  line: number
  raw: Record<string, string>
  errors: CsvRowError[]
}

export interface CsvImportPreviewData {
  type: CsvImportType
  boatId: number
  boatName: string
  totalRows: number
  validRows: number
  invalidRows: number
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
