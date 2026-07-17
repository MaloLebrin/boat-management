import type { MaintenanceEventRow, MaintenanceHistoryFilters } from '#shared/types/maintenance'
import type { I18n } from '@adonisjs/i18n'
import PDFDocument from 'pdfkit'

const NAVY = '#0b1d2e'
const CORAL = '#e2674f'
const GREY_B = '#e0e0e0'
const GREY_M = '#888888'
const GREY_D = '#333333'
const WHITE = '#ffffff'

const PAGE_W = 595.28
const MARGIN = 48
const CONTENT_W = PAGE_W - MARGIN * 2

const C_DATE = 60
const C_BOAT = 110
const C_SUBJECT = 80
const C_TITLE = CONTENT_W - C_DATE - C_BOAT - C_SUBJECT

export default class MaintenanceHistoryPdfService {
  async generate(
    events: MaintenanceEventRow[],
    filters: MaintenanceHistoryFilters,
    boatName: string | null,
    i18n: I18n
  ): Promise<{ buffer: Buffer; filename: string }> {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    const t = (key: string, data?: Record<string, string>) =>
      i18n.t(`maintenance.history.pdf.${key}`, data)
    const subjectLabel = (subject: string) => i18n.t(`maintenance.history.subjects.${subject}`)

    this.#renderHeader(doc, filters, boatName, t, subjectLabel)
    this.#renderTable(doc, events, t, subjectLabel)

    doc.end()
    await new Promise<void>((resolve) => doc.on('end', resolve))

    const date = new Date().toISOString().slice(0, 10)
    return {
      buffer: Buffer.concat(chunks),
      filename: `historique-maintenance-${date}.pdf`,
    }
  }

  #renderHeader(
    doc: PDFKit.PDFDocument,
    filters: MaintenanceHistoryFilters,
    boatName: string | null,
    t: (key: string, data?: Record<string, string>) => string,
    subjectLabel: (subject: string) => string
  ): void {
    const HEADER_H = 90

    doc.rect(0, 0, PAGE_W, HEADER_H).fill(NAVY)

    doc.fillColor(WHITE).fontSize(18).font('Helvetica-Bold').text('FleetView', MARGIN, 22)
    doc.fillColor(CORAL).fontSize(12).font('Helvetica-Bold').text(t('title'), MARGIN, 46)
    doc
      .fillColor(GREY_M)
      .fontSize(8)
      .font('Helvetica')
      .text(t('generatedOn', { date: new Date().toLocaleDateString() }), MARGIN, 66)

    doc.rect(0, HEADER_H, PAGE_W, 3).fill(CORAL)
    doc.fillColor('#000')

    doc.y = HEADER_H + 20

    const activeFilters: string[] = []
    if (boatName) activeFilters.push(t('filterBoat', { name: boatName }))
    if (filters.subject)
      activeFilters.push(t('filterSubject', { label: subjectLabel(filters.subject) }))
    if (filters.dateFrom) activeFilters.push(t('filterDateFrom', { date: filters.dateFrom }))
    if (filters.dateTo) activeFilters.push(t('filterDateTo', { date: filters.dateTo }))
    if (filters.q) activeFilters.push(t('filterSearch', { query: filters.q }))

    doc
      .fontSize(8.5)
      .font('Helvetica')
      .fillColor(GREY_D)
      .text(
        activeFilters.length > 0 ? activeFilters.join('  •  ') : t('filtersNone'),
        MARGIN,
        doc.y,
        {
          width: CONTENT_W,
        }
      )

    doc.moveDown(1)
    doc.rect(MARGIN, doc.y, CONTENT_W, 0.5).fill(GREY_B)
    doc.moveDown(0.8)
    doc.fillColor('#000')
  }

  #renderTable(
    doc: PDFKit.PDFDocument,
    events: MaintenanceEventRow[],
    t: (key: string, data?: Record<string, string>) => string,
    subjectLabel: (subject: string) => string
  ): void {
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor(GREY_D)
      .text(t('totalEvents', { count: String(events.length) }), MARGIN, doc.y)
    doc.moveDown(0.6)

    if (events.length === 0) {
      doc.fontSize(9).font('Helvetica').fillColor(GREY_M).text(t('noEvents'))
      doc.fillColor('#000')
      return
    }

    const drawRow = (
      y: number,
      date: string,
      boat: string,
      subject: string,
      title: string,
      isHeader: boolean
    ) => {
      const font = isHeader ? 'Helvetica-Bold' : 'Helvetica'
      const color = isHeader ? WHITE : GREY_D
      if (isHeader) {
        doc.rect(MARGIN - 12, y - 4, CONTENT_W + 24, 20).fill(NAVY)
      }
      doc.fontSize(8).font(font).fillColor(color)
      doc.text(date, MARGIN, y, { width: C_DATE - 4, lineBreak: false })
      doc.text(boat, MARGIN + C_DATE, y, { width: C_BOAT - 4, lineBreak: false })
      doc.text(subject, MARGIN + C_DATE + C_BOAT, y, { width: C_SUBJECT - 4, lineBreak: false })
      doc.text(title, MARGIN + C_DATE + C_BOAT + C_SUBJECT, y, { width: C_TITLE, lineBreak: false })
      doc.fillColor('#000')
    }

    const drawHeaderRow = () => {
      const headerY = doc.y
      drawRow(
        headerY,
        t('columns.date'),
        t('columns.boat'),
        t('columns.subject'),
        t('columns.title'),
        true
      )
      doc.text('', MARGIN, headerY + 20)
    }

    drawHeaderRow()

    for (const ev of events) {
      if (doc.y > 750) {
        doc.addPage()
        drawHeaderRow()
      }
      const rowY = doc.y
      drawRow(rowY, ev.performedAt, ev.boatName, subjectLabel(ev.subject), ev.title, false)

      let noteY = rowY + 12
      if (ev.notes) {
        doc
          .fontSize(7.5)
          .font('Helvetica')
          .fillColor(GREY_M)
          .text(ev.notes, MARGIN + C_DATE + C_BOAT + C_SUBJECT, noteY, { width: C_TITLE })
        noteY = doc.y
      }
      if (ev.parts.length > 0) {
        doc
          .fontSize(7.5)
          .font('Helvetica')
          .fillColor(GREY_M)
          .text(t('partsCount', { count: String(ev.parts.length) }), MARGIN + C_DATE, noteY, {
            width: C_BOAT + C_SUBJECT + C_TITLE,
          })
        noteY = doc.y
      }

      doc.fillColor('#000')
      doc.rect(MARGIN, noteY + 4, CONTENT_W, 0.5).fill(GREY_B)
      doc.text('', MARGIN, noteY + 8)
    }
  }
}
