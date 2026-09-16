import type RentalContract from '#models/rental_contract'
import type Organization from '#models/organization'
import type { I18n } from '@adonisjs/i18n'
import { inject } from '@adonisjs/core'
import {
  createPdfDocument,
  divider,
  renderBrandedHeader,
  renderPagedFooter,
  resolveBranding,
} from '#services/pdf/document'
import { PDF_COLORS, PDF_PAGE } from '#services/pdf/theme'

const { navy: NAVY, greyM: GREY_M, greyD: GREY_D } = PDF_COLORS
const { height: PAGE_H, margin: MARGIN, contentWidth: CONTENT_W } = PDF_PAGE

@inject()
export default class RentalContractPdfService {
  /**
   * Generates a PDF for the given rental contract.
   * The contract must have `reservation.boat` and `client` preloaded.
   */
  async generate(
    contract: RentalContract,
    org: Organization,
    i18n: I18n
  ): Promise<{ buffer: Buffer; filename: string }> {
    const { doc, finish } = createPdfDocument({ bufferPages: true })

    const t = (key: string, data?: Record<string, string>) =>
      i18n.t(`rentalContracts.pdf.${key}`, data)
    const branding = resolveBranding(org)

    const reservation = contract.reservation
    const clientName = contract.client?.fullName ?? reservation.clientName
    const clientEmail = contract.client?.email ?? reservation.clientEmail
    const clientPhone = contract.client?.phone ?? reservation.clientPhone

    const title = `${t('title')} #${contract.id}`
    await renderBrandedHeader(doc, {
      branding,
      title,
      generatedOn: (date) => t('generatedOn', { date }),
      locale: i18n.locale,
    })
    this.#renderMetadata(doc, contract, clientName, clientEmail, clientPhone, t)
    this.#renderBoatAndPeriod(doc, contract, t)
    this.#renderConditions(doc, t)
    renderPagedFooter(doc, (page, total) =>
      t('footer', { page: String(page), total: String(total), org: branding.displayName })
    )

    const buffer = await finish()

    return {
      buffer,
      filename: `contrat-location-${contract.id}.pdf`,
    }
  }

  #renderMetadata(
    doc: PDFKit.PDFDocument,
    contract: RentalContract,
    clientName: string,
    clientEmail: string | null,
    clientPhone: string | null,
    t: (key: string, data?: Record<string, string>) => string
  ): void {
    const startY = doc.y

    doc.fontSize(9).font('Helvetica-Bold').fillColor(NAVY).text(t('status'), MARGIN, startY)
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(GREY_D)
      .text(t(`statuses.${contract.status}`), MARGIN + 90, startY)

    const rightX = MARGIN + CONTENT_W / 2
    doc.fontSize(9).font('Helvetica-Bold').fillColor(NAVY).text(t('client'), rightX, startY)
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(GREY_D)
      .text(clientName, rightX, startY + 14)

    let clientY = startY + 28
    if (clientEmail) {
      doc.fontSize(8).font('Helvetica').fillColor(GREY_M).text(clientEmail, rightX, clientY)
      clientY += 12
    }
    if (clientPhone) {
      doc.fontSize(8).font('Helvetica').fillColor(GREY_M).text(clientPhone, rightX, clientY)
    }

    doc.text('', MARGIN, startY + 44)
    divider(doc)
  }

  #renderBoatAndPeriod(
    doc: PDFKit.PDFDocument,
    contract: RentalContract,
    t: (key: string, data?: Record<string, string>) => string
  ): void {
    const reservation = contract.reservation
    const boat = reservation.boat

    doc.fontSize(11).font('Helvetica-Bold').fillColor(NAVY).text(t('boat'), MARGIN, doc.y)
    doc.moveDown(0.3)
    doc.fontSize(9).font('Helvetica').fillColor(GREY_D).text(boat.name, MARGIN, doc.y)
    doc.moveDown(0.8)

    doc.fontSize(11).font('Helvetica-Bold').fillColor(NAVY).text(t('period'), MARGIN, doc.y)
    doc.moveDown(0.3)
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(GREY_D)
      .text(
        t('periodRange', {
          start: reservation.startsAt.toISODate() ?? '',
          end: reservation.endsAt.toISODate() ?? '',
        }),
        MARGIN,
        doc.y
      )
    doc.moveDown(0.8)

    divider(doc)
  }

  #renderConditions(
    doc: PDFKit.PDFDocument,
    t: (key: string, data?: Record<string, string>) => string
  ): void {
    if (doc.y > PAGE_H - 150) doc.addPage()

    doc.fontSize(11).font('Helvetica-Bold').fillColor(NAVY).text(t('conditions'), MARGIN, doc.y)
    doc.moveDown(0.4)
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(GREY_D)
      .text(t('conditionsText'), MARGIN, doc.y, { width: CONTENT_W, align: 'justify' })
  }
}
