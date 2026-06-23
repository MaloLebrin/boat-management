import { DateTime } from 'luxon'

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function buildCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): Buffer {
  const BOM = '﻿'
  const lines = [headers.map(escapeCell).join(';'), ...rows.map((r) => r.map(escapeCell).join(';'))]
  return Buffer.from(BOM + lines.join('\r\n'), 'utf-8')
}

export function csvFilename(base: string, boatName: string): string {
  const safe = boatName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  return `${base}_${safe}_${DateTime.now().toISODate()}.csv`
}
