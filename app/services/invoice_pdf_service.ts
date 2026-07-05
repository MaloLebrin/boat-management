import type Invoice from '#models/invoice'
import type Organization from '#models/organization'
import type { I18n } from '@adonisjs/i18n'
import { inject } from '@adonisjs/core'
import PDFDocument from 'pdfkit'
import { PLAN_LIMITS } from '#shared/types/plan'

const NAVY = '#0b1d2e'
const CORAL = '#e2674f'
const GREY_B = '#e0e0e0'
const GREY_M = '#888888'
const GREY_D = '#333333'
const WHITE = '#ffffff'

const DEFAULT_PRIMARY_COLOR = '#1e3a5f'

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 48
const CONTENT_W = PAGE_W - MARGIN * 2

@inject()
export default class InvoicePdfService {
  /**
   * Generates a PDF for the given invoice.
   * The invoice must have `lines` and `client` preloaded.
   */
  async generate(
    invoice: Invoice,
    org: Organization,
    i18n: I18n
  ): Promise<{ buffer: Buffer; filename: string }> {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    const t = (key: string, data?: Record<string, string>) => i18n.t(`invoices.pdf.${key}`, data)
    const canWhiteLabel = PLAN_LIMITS[org.plan].canWhiteLabel
    const primaryColor =
      canWhiteLabel && org.primaryColor ? org.primaryColor : DEFAULT_PRIMARY_COLOR

    await this.#renderHeader(doc, invoice, org, primaryColor, canWhiteLabel, t)
    this.#renderMetadata(doc, invoice, t)
    this.#renderLinesTable(doc, invoice, primaryColor, t)
    this.#renderTotals(doc, invoice, t)
    this.#renderNotes(doc, invoice, t)
    this.#renderLegalMentions(doc, t)
    this.#renderFooter(doc, org, t)

    doc.end()
    await new Promise<void>((resolve) => doc.on('end', resolve))

    const safeNumber = invoice.number.replace(/[^a-zA-Z0-9-_]/g, '_')
    return {
      buffer: Buffer.concat(chunks),
      filename: `${safeNumber}.pdf`,
    }
  }

  async #renderHeader(
    doc: PDFKit.PDFDocument,
    invoice: Invoice,
    org: Organization,
    primaryColor: string,
    canWhiteLabel: boolean,
    t: (key: string, data?: Record<string, string>) => string
  ): Promise<void> {
    const HEADER_H = 100

    doc.rect(0, 0, PAGE_W, HEADER_H).fill(primaryColor)

    // Logo (only if white-label enabled and org has a logo)
    let textX = MARGIN
    if (canWhiteLabel && org.logoUrl) {
      try {
        const res = await fetch(org.logoUrl)
        const buf = Buffer.from(await res.arrayBuffer())
        doc.image(buf, MARGIN, 20, { width: 60 })
        textX = MARGIN + 76
      } catch {
        // Skip logo if fetch fails
      }
    }

    // Organization name
    const displayName = canWhiteLabel && org.appName ? org.appName : org.name
    doc.fillColor(WHITE).fontSize(18).font('Helvetica-Bold').text(displayName, textX, 25)

    // Document title and number
    const titleLabel = invoice.kind === 'quote' ? t('titleQuote') : t('titleInvoice')
    doc
      .fillColor(CORAL)
      .fontSize(12)
      .font('Helvetica')
      .text(`${titleLabel} ${invoice.number}`, textX, 50)

    // Generation date
    doc
      .fillColor(GREY_M)
      .fontSize(8)
      .font('Helvetica')
      .text(t('generatedOn', { date: new Date().toLocaleDateString() }), textX, 75)

    // Accent bar
    doc.rect(0, HEADER_H, PAGE_W, 3).fill(CORAL)
    doc.text('', MARGIN, HEADER_H + 3 + 20)
    doc.fillColor('#000')
  }

  #renderMetadata(
    doc: PDFKit.PDFDocument,
    invoice: Invoice,
    t: (key: string, data?: Record<string, string>) => string
  ): void {
    const startY = doc.y

    // Left column: dates and status
    doc.fontSize(9).font('Helvetica-Bold').fillColor(NAVY).text(t('issuedAt'), MARGIN, startY)
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(GREY_D)
      .text(invoice.issuedAt?.toISODate() ?? '-', MARGIN + 90, startY)

    if (invoice.dueAt) {
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor(NAVY)
        .text(t('dueAt'), MARGIN, startY + 14)
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(GREY_D)
        .text(invoice.dueAt.toISODate() ?? '-', MARGIN + 90, startY + 14)
    }

    const statusY = invoice.dueAt ? startY + 28 : startY + 14
    doc.fontSize(9).font('Helvetica-Bold').fillColor(NAVY).text(t('status'), MARGIN, statusY)
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(GREY_D)
      .text(t(`statuses.${invoice.status}`), MARGIN + 90, statusY)

    // Right column: client
    const rightX = MARGIN + CONTENT_W / 2
    doc.fontSize(9).font('Helvetica-Bold').fillColor(NAVY).text(t('client'), rightX, startY)
    const clientName = invoice.clientName ?? t('noClient')
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(GREY_D)
      .text(clientName, rightX, startY + 14)

    if (invoice.client?.email) {
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(GREY_M)
        .text(invoice.client.email, rightX, startY + 28)
    }

    doc.text('', MARGIN, statusY + 30)
    this.#divider(doc)
  }

  #renderLinesTable(
    doc: PDFKit.PDFDocument,
    invoice: Invoice,
    primaryColor: string,
    t: (key: string, data?: Record<string, string>) => string
  ): void {
    const C_DESC = CONTENT_W * 0.5
    const C_QTY = CONTENT_W * 0.12
    const C_UNIT = CONTENT_W * 0.19
    const C_AMOUNT = CONTENT_W * 0.19

    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: invoice.currency,
      minimumFractionDigits: 2,
    })

    // Header row
    const headerY = doc.y
    doc.rect(MARGIN - 8, headerY - 4, CONTENT_W + 16, 20).fill(primaryColor)

    doc.fontSize(8).font('Helvetica-Bold').fillColor(WHITE)
    doc.text(t('colDescription'), MARGIN, headerY, { width: C_DESC - 4 })
    doc.text(t('colQuantity'), MARGIN + C_DESC, headerY, { width: C_QTY - 4, align: 'right' })
    doc.text(t('colUnitPrice'), MARGIN + C_DESC + C_QTY, headerY, {
      width: C_UNIT - 4,
      align: 'right',
    })
    doc.text(t('colAmount'), MARGIN + C_DESC + C_QTY + C_UNIT, headerY, {
      width: C_AMOUNT,
      align: 'right',
    })

    doc.text('', MARGIN, headerY + 20)
    doc.fillColor('#000')

    // Data rows
    const lines = [...invoice.lines].sort((a, b) => a.position - b.position)
    for (const [i, line] of lines.entries()) {
      if (doc.y > PAGE_H - 120) doc.addPage()

      const rowY = doc.y
      const bgColor = i % 2 === 0 ? '#f8f8f8' : WHITE

      doc.rect(MARGIN - 8, rowY - 2, CONTENT_W + 16, 18).fill(bgColor)

      const qty = Number.parseFloat(line.quantity)
      const unitPrice = Number.parseFloat(line.unitPrice)
      const amount = Number.parseFloat(line.amount)

      doc.fontSize(8).font('Helvetica').fillColor(GREY_D)
      doc.text(line.label, MARGIN, rowY, { width: C_DESC - 8 })
      doc.text(String(qty), MARGIN + C_DESC, rowY, { width: C_QTY - 4, align: 'right' })
      doc.text(formatter.format(unitPrice), MARGIN + C_DESC + C_QTY, rowY, {
        width: C_UNIT - 4,
        align: 'right',
      })
      doc.text(formatter.format(amount), MARGIN + C_DESC + C_QTY + C_UNIT, rowY, {
        width: C_AMOUNT,
        align: 'right',
      })

      doc.text('', MARGIN, rowY + 16)
    }

    doc.moveDown(0.5)
  }

  #renderTotals(
    doc: PDFKit.PDFDocument,
    invoice: Invoice,
    t: (key: string, data?: Record<string, string>) => string
  ): void {
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: invoice.currency,
      minimumFractionDigits: 2,
    })

    const subtotal = Number.parseFloat(invoice.subtotal)
    const taxRate = Number.parseFloat(invoice.taxRate)
    const taxAmount = Number.parseFloat(invoice.taxAmount)
    const total = Number.parseFloat(invoice.total)

    const labelX = MARGIN + CONTENT_W * 0.6
    const valueX = MARGIN + CONTENT_W * 0.85
    const valueW = CONTENT_W * 0.15

    if (doc.y > PAGE_H - 100) doc.addPage()

    // Subtotal
    let y = doc.y
    doc.fontSize(9).font('Helvetica').fillColor(GREY_D).text(t('subtotal'), labelX, y)
    doc.text(formatter.format(subtotal), valueX, y, { width: valueW, align: 'right' })

    // Tax
    y += 16
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(GREY_D)
      .text(t('tax', { rate: String(taxRate) }), labelX, y)
    doc.text(formatter.format(taxAmount), valueX, y, { width: valueW, align: 'right' })

    // Total
    y += 20
    doc.rect(labelX - 8, y - 4, CONTENT_W * 0.4 + 16, 22).fill(NAVY)
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(WHITE)
      .text(t('total'), labelX, y + 2)
    doc.text(formatter.format(total), valueX, y + 2, { width: valueW, align: 'right' })

    doc.fillColor('#000')
    doc.text('', MARGIN, y + 30)
  }

  #renderNotes(
    doc: PDFKit.PDFDocument,
    invoice: Invoice,
    t: (key: string, data?: Record<string, string>) => string
  ): void {
    if (!invoice.notes) return

    if (doc.y > PAGE_H - 80) doc.addPage()

    doc.moveDown(0.5)
    doc.fontSize(9).font('Helvetica-Bold').fillColor(NAVY).text(t('notes'), MARGIN, doc.y)
    doc.moveDown(0.3)
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(GREY_D)
      .text(invoice.notes, MARGIN, doc.y, { width: CONTENT_W })
    doc.moveDown(0.5)
  }

  #renderLegalMentions(
    doc: PDFKit.PDFDocument,
    t: (key: string, data?: Record<string, string>) => string
  ): void {
    if (doc.y > PAGE_H - 60) doc.addPage()

    this.#divider(doc)
    doc.fontSize(7).font('Helvetica').fillColor(GREY_M).text(t('legalMentions'), MARGIN, doc.y, {
      width: CONTENT_W,
      align: 'center',
    })
  }

  #renderFooter(
    doc: PDFKit.PDFDocument,
    org: Organization,
    t: (key: string, data?: Record<string, string>) => string
  ): void {
    const canWhiteLabel = PLAN_LIMITS[org.plan].canWhiteLabel
    const displayName = canWhiteLabel && org.appName ? org.appName : org.name

    const range = doc.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i)
      const pageNum = i - range.start + 1
      const totalPages = range.count
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(GREY_M)
        .text(
          t('footer', { page: String(pageNum), total: String(totalPages), org: displayName }),
          MARGIN,
          PAGE_H - MARGIN / 2,
          { width: CONTENT_W, align: 'center' }
        )
    }
  }

  #divider(doc: PDFKit.PDFDocument, gap = 0.8): void {
    doc.moveDown(0.4)
    doc.rect(MARGIN, doc.y, CONTENT_W, 0.5).fill(GREY_B)
    doc.moveDown(gap)
  }
}
