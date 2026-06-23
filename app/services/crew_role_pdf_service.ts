import type CrewMember from '#models/crew_member'
import type NavigationLog from '#models/navigation_log'
import type { I18n } from '@adonisjs/i18n'
import PDFDocument from 'pdfkit'
import type { NavigationLogCrewRole } from '#shared/types/crew'

const NAVY = '#0b1d2e'
const CORAL = '#e2674f'
const GREY_B = '#e0e0e0'
const GREY_M = '#888888'
const WHITE = '#ffffff'

const PAGE_W = 595.28
const MARGIN = 48
const CONTENT_W = PAGE_W - MARGIN * 2

export default class CrewRolePdfService {
  async generate(
    log: NavigationLog,
    crewWithRoles: Array<{ member: CrewMember; role: NavigationLogCrewRole }>,
    i18n: I18n
  ): Promise<{ buffer: Buffer; filename: string }> {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    const t = (key: string) => i18n.t(`crew.pdf.${key}`)

    this.#renderHeader(doc, log, t)
    this.#renderCrewTable(doc, crewWithRoles, t)
    this.#renderFooter(doc, t)

    doc.end()
    await new Promise<void>((resolve) => doc.on('end', resolve))

    const dateStr = log.departedAt.toFormat('yyyy-MM-dd')
    return {
      buffer: Buffer.concat(chunks),
      filename: `role-equipage-${dateStr}.pdf`,
    }
  }

  #renderHeader(doc: PDFKit.PDFDocument, log: NavigationLog, t: (key: string) => string): void {
    // Banner
    doc.rect(MARGIN, MARGIN, CONTENT_W, 48).fill(NAVY)

    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(WHITE)
      .text(t('title'), MARGIN + 16, MARGIN + 15, { width: CONTENT_W - 32 })

    doc.moveDown(0.5)

    const y = MARGIN + 64
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(NAVY)
      .text(`${t('departedAt')} : ${log.departedAt.toFormat('dd/MM/yyyy HH:mm')}`, MARGIN, y)

    if (log.arrivedAt) {
      doc.text(`${t('arrivedAt')} : ${log.arrivedAt.toFormat('dd/MM/yyyy HH:mm')}`, MARGIN, y + 16)
    }

    const depPort = log.departurePortName ?? '—'
    const arrPort = log.arrivalPortName ?? '—'
    doc.text(`${t('route')} : ${depPort} → ${arrPort}`, MARGIN, y + 32)

    doc.moveDown(2)
  }

  #renderCrewTable(
    doc: PDFKit.PDFDocument,
    crewWithRoles: Array<{ member: CrewMember; role: NavigationLogCrewRole }>,
    t: (key: string) => string
  ): void {
    const startY = doc.y + 8

    // Table header
    doc.rect(MARGIN, startY, CONTENT_W, 24).fill(CORAL)

    const cols = [
      { label: t('colName'), x: MARGIN + 8, w: CONTENT_W * 0.35 },
      { label: t('colRole'), x: MARGIN + CONTENT_W * 0.35 + 8, w: CONTENT_W * 0.25 },
      { label: t('colEmail'), x: MARGIN + CONTENT_W * 0.6 + 8, w: CONTENT_W * 0.4 - 8 },
    ]

    doc.font('Helvetica-Bold').fontSize(9).fillColor(WHITE)
    for (const col of cols) {
      doc.text(col.label, col.x, startY + 7, { width: col.w })
    }

    // Rows
    let rowY = startY + 24
    for (const [i, { member, role }] of crewWithRoles.entries()) {
      const bg = i % 2 === 0 ? '#f8f8f8' : WHITE
      doc.rect(MARGIN, rowY, CONTENT_W, 22).fill(bg).stroke(GREY_B)

      doc.font('Helvetica').fontSize(9).fillColor(NAVY)
      doc.text(member.fullName, cols[0].x, rowY + 6, { width: cols[0].w })
      doc.text(t(`roles.${role}`), cols[1].x, rowY + 6, { width: cols[1].w })
      doc.text(member.email ?? '—', cols[2].x, rowY + 6, { width: cols[2].w })

      rowY += 22
    }

    if (crewWithRoles.length === 0) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(GREY_M)
        .text(t('noCrewMembers'), MARGIN + 8, rowY + 6)
      rowY += 22
    }

    doc.y = rowY + 12
  }

  #renderFooter(doc: PDFKit.PDFDocument, t: (key: string) => string): void {
    const range = doc.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i)
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(GREY_M)
        .text(t('footer'), MARGIN, doc.page.height - MARGIN / 2, {
          width: CONTENT_W,
          align: 'center',
        })
    }
  }
}
