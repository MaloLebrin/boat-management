import type CrewMember from '#models/crew_member'
import type NavigationLog from '#models/navigation_log'
import type { I18n } from '@adonisjs/i18n'
import { createPdfDocument, renderPagedFooter } from '#services/pdf/document'
import { PDF_COLORS, PDF_PAGE } from '#services/pdf/theme'
import type { NavigationLogCrewRole } from '#shared/types/crew'

const {
  navy: NAVY,
  coral: CORAL,
  greyB: GREY_B,
  greyM: GREY_M,
  white: WHITE,
  rowAlt: ROW_ALT,
} = PDF_COLORS
const { margin: MARGIN, contentWidth: CONTENT_W } = PDF_PAGE

export default class CrewRolePdfService {
  async generate(
    log: NavigationLog,
    crewWithRoles: Array<{ member: CrewMember; role: NavigationLogCrewRole }>,
    i18n: I18n
  ): Promise<{ buffer: Buffer; filename: string }> {
    const { doc, finish } = createPdfDocument()

    const t = (key: string) => i18n.t(`crew.pdf.${key}`)

    this.#renderHeader(doc, log, t)
    this.#renderCrewTable(doc, crewWithRoles, t)
    renderPagedFooter(doc, () => t('footer'))

    const buffer = await finish()

    const dateStr = log.departedAt.toFormat('yyyy-MM-dd')
    return {
      buffer,
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
      const bg = i % 2 === 0 ? ROW_ALT : WHITE
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
}
