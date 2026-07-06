import type RentalContract from '#models/rental_contract'
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
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    const t = (key: string, data?: Record<string, string>) =>
      i18n.t(`rentalContracts.pdf.${key}`, data)
    const canWhiteLabel = PLAN_LIMITS[org.plan].canWhiteLabel
    const primaryColor =
      canWhiteLabel && org.primaryColor ? org.primaryColor : DEFAULT_PRIMARY_COLOR

    const reservation = contract.reservation
    const clientName = contract.client?.fullName ?? reservation.clientName
    const clientEmail = contract.client?.email ?? reservation.clientEmail
    const clientPhone = contract.client?.phone ?? reservation.clientPhone

    await this.#renderHeader(doc, contract, org, primaryColor, canWhiteLabel, t)
    this.#renderMetadata(doc, contract, clientName, clientEmail, clientPhone, t)
    this.#renderBoatAndPeriod(doc, contract, t)
    this.#renderConditions(doc, t)
    this.#renderFooter(doc, org, t)

    doc.end()
    await new Promise<void>((resolve) => doc.on('end', resolve))

    return {
      buffer: Buffer.concat(chunks),
      filename: `contrat-location-${contract.id}.pdf`,
    }
  }

  async #renderHeader(
    doc: PDFKit.PDFDocument,
    contract: RentalContract,
    org: Organization,
    primaryColor: string,
    canWhiteLabel: boolean,
    t: (key: string, data?: Record<string, string>) => string
  ): Promise<void> {
    const HEADER_H = 100

    doc.rect(0, 0, PAGE_W, HEADER_H).fill(primaryColor)

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

    const displayName = canWhiteLabel && org.appName ? org.appName : org.name
    doc.fillColor(WHITE).fontSize(18).font('Helvetica-Bold').text(displayName, textX, 25)

    doc
      .fillColor(CORAL)
      .fontSize(12)
      .font('Helvetica')
      .text(`${t('title')} #${contract.id}`, textX, 50)

    doc
      .fillColor(GREY_M)
      .fontSize(8)
      .font('Helvetica')
      .text(t('generatedOn', { date: new Date().toLocaleDateString() }), textX, 75)

    doc.rect(0, HEADER_H, PAGE_W, 3).fill(CORAL)
    doc.text('', MARGIN, HEADER_H + 3 + 20)
    doc.fillColor('#000')
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
    this.#divider(doc)
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

    this.#divider(doc)
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
