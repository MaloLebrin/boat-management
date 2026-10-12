import type Organization from '#models/organization'
import FleetDigestMailService from '#services/fleet_digest_mail_service'
import {
  createPdfDocument,
  divider,
  renderBrandedHeader,
  renderPagedFooter,
  resolveBranding,
} from '#services/pdf/document'
import { PDF_COLORS, PDF_PAGE } from '#services/pdf/theme'
import type { MonthlyFleetReport } from '#shared/types/fleet_digest'
import { inject } from '@adonisjs/core'
import type { I18n } from '@adonisjs/i18n'

const { navy: NAVY, greyB: GREY_B, greyM: GREY_M, greyD: GREY_D, white: WHITE } = PDF_COLORS
const { margin: MARGIN, contentWidth: CONTENT_W } = PDF_PAGE
const PAGE_BOTTOM = 770

interface PdfColumn {
  key: string
  label: string
  /** Part de la largeur utile. */
  width: number
  align: 'left' | 'right'
}

/**
 * PDF du rapport mensuel de flotte (#871), joint à l'e-mail du 1er du mois :
 * un document archivable — « prêt pour l'assurance » — à l'en-tête de
 * l'organisation (marque blanche Entreprise comprise). Mêmes chiffres et
 * mêmes libellés que l'e-mail : le modèle de vue vient de
 * `FleetDigestMailService.monthlyView`.
 */
@inject()
export default class FleetReportPdfService {
  constructor(private mailService: FleetDigestMailService) {}

  async generate(
    report: MonthlyFleetReport,
    org: Organization,
    i18n: I18n
  ): Promise<{ buffer: Buffer; filename: string }> {
    const view = this.mailService.monthlyView(report, i18n)
    const t = (key: string, data?: Record<string, unknown>) =>
      i18n.t(`reports.digest.monthly.pdf.${key}`, data)
    const { doc, finish } = createPdfDocument({ bufferPages: true })

    await renderBrandedHeader(doc, {
      branding: resolveBranding(org),
      title: view.heading,
      generatedOn: (date) => t('generatedOn', { date }),
      locale: i18n.locale,
    })

    doc.fontSize(9).font('Helvetica').fillColor(GREY_D).text(view.period, MARGIN, doc.y)
    divider(doc)

    this.#keyValues(doc, t('summary'), view.kpis)
    if (view.topCategories.length > 0) {
      this.#keyValues(doc, view.topCategoriesTitle, view.topCategories)
    }
    if (view.boats.length > 0) this.#boats(doc, view)

    renderPagedFooter(doc, (page, total) =>
      t('footer', { org: report.organization.name, page, total })
    )

    return {
      buffer: await finish(),
      filename: `${t('filename', { month: report.month })}.pdf`,
    }
  }

  #title(doc: PDFKit.PDFDocument, title: string): void {
    if (doc.y > PAGE_BOTTOM - 60) doc.addPage()
    doc.moveDown(0.6)
    doc.fontSize(11).font('Helvetica-Bold').fillColor(NAVY).text(title, MARGIN, doc.y)
    doc.moveDown(0.4)
  }

  #keyValues(doc: PDFKit.PDFDocument, title: string, rows: { label: string; value: string }[]) {
    this.#title(doc, title)
    for (const row of rows) {
      if (doc.y > PAGE_BOTTOM) doc.addPage()
      const y = doc.y
      doc.fontSize(9).font('Helvetica').fillColor(GREY_D)
      doc.text(row.label, MARGIN, y, { width: CONTENT_W * 0.6, lineBreak: false })
      doc.font('Helvetica-Bold').text(row.value, MARGIN + CONTENT_W * 0.6, y, {
        width: CONTENT_W * 0.4,
        align: 'right',
        lineBreak: false,
      })
      doc.rect(MARGIN, y + 14, CONTENT_W, 0.5).fill(GREY_B)
      doc.text('', MARGIN, y + 20)
    }
  }

  #boats(doc: PDFKit.PDFDocument, view: ReturnType<FleetDigestMailService['monthlyView']>) {
    this.#title(doc, view.boatsTitle)
    const columns: PdfColumn[] = [
      { key: 'name', label: view.boatColumns.boat, width: 0.34, align: 'left' },
      { key: 'costs', label: view.boatColumns.costs, width: 0.22, align: 'right' },
      { key: 'engineHours', label: view.boatColumns.engineHours, width: 0.16, align: 'right' },
    ]
    if (view.showRental) {
      columns.push(
        { key: 'revenue', label: view.boatColumns.revenue, width: 0.16, align: 'right' },
        { key: 'occupancy', label: view.boatColumns.occupancy, width: 0.12, align: 'right' }
      )
    }

    const drawRow = (cells: Record<string, string>, header: boolean) => {
      if (doc.y > PAGE_BOTTOM) doc.addPage()
      const y = doc.y
      if (header) doc.rect(MARGIN - 6, y - 4, CONTENT_W + 12, 18).fill(NAVY)
      doc
        .fontSize(8)
        .font(header ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(header ? WHITE : GREY_D)
      let x = MARGIN
      for (const column of columns) {
        const width = CONTENT_W * column.width
        doc.text(cells[column.key] ?? '', x, y, {
          width: width - 4,
          align: column.align,
          lineBreak: false,
        })
        x += width
      }
      if (!header) doc.rect(MARGIN, y + 13, CONTENT_W, 0.5).fill(GREY_B)
      doc.text('', MARGIN, y + 18)
    }

    drawRow(Object.fromEntries(columns.map((c) => [c.key, c.label])), true)
    for (const boat of view.boats) drawRow(boat, false)
    doc.fillColor(GREY_M)
  }
}
