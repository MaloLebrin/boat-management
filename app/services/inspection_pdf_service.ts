import type Organization from '#models/organization'
import type { I18n } from '@adonisjs/i18n'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  createPdfDocument,
  divider,
  renderBrandedHeader,
  renderPagedFooter,
  resolveBranding,
} from '#services/pdf/document'
import { PDF_COLORS, PDF_PAGE } from '#services/pdf/theme'
import { formatDate, formatDateTime } from '#shared/helpers/date_format'
import {
  inspectionReportChanges,
  inspectionReportSections,
  inspectionReportTally,
} from '#shared/helpers/inspection_report'
import { INSPECTION_SIGNATURE_ROLES } from '#shared/types/inspection'
import type {
  InspectionItemState,
  InspectionPdfData,
  InspectionReportSection,
} from '#shared/types/inspection'

const { navy: NAVY, coral: CORAL, greyB: GREY_B, greyM: GREY_M, greyD: GREY_D } = PDF_COLORS
const { height: PAGE_H, margin: MARGIN, contentWidth: CONTENT_W } = PDF_PAGE

/** Bas de la zone utile : sous cette ligne, le pied de page. */
const BOTTOM = PAGE_H - MARGIN - 10

type Translate = (key: string, data?: Record<string, string>) => string

/**
 * PDF d'état des lieux (#889) : en-tête de marque, réservation et client,
 * relevés, checklist par zone, écarts avec le départ (pour un retour),
 * défauts, vignettes photos et zone de signatures.
 *
 * Un état des lieux non signé sort en **brouillon** (mention en tête, cadres
 * de signature vides) ; signé, il est produit une seule fois puis archivé —
 * voir `InspectionDocumentService.sign`.
 */
@inject()
export default class InspectionPdfService {
  async generate(
    data: InspectionPdfData,
    org: Organization,
    i18n: I18n
  ): Promise<{ buffer: Buffer; filename: string }> {
    const { doc, finish } = createPdfDocument({ bufferPages: true })
    // Les clés du corpus (`labelKey`, `titleKey`) sont déjà complètes.
    const t: Translate = (key, values) =>
      i18n.t(key.startsWith('inspections.') ? key : `inspections.${key}`, values)
    const branding = resolveBranding(org)
    const locale = i18n.locale

    await renderBrandedHeader(doc, {
      branding,
      title: t('pdf.title', { kind: t(`kind.${data.kind}`), id: String(data.inspectionId) }),
      generatedOn: (date) => t('pdf.generatedOn', { date }),
      locale,
    })

    this.#renderStatus(doc, data, t, locale)
    this.#renderSummary(doc, data, t, locale)

    const sections = inspectionReportSections(data.boat.category, data.items)
    this.#renderChecklist(doc, sections, t)

    if (data.counterpart) this.#renderComparison(doc, data, sections, t)
    this.#renderDefects(doc, data, t)
    this.#renderPhotos(doc, data, t)
    this.#renderSignatures(doc, data, t, locale)

    renderPagedFooter(doc, (page, total) =>
      t('pdf.footer', { page: String(page), total: String(total), org: branding.displayName })
    )

    return {
      buffer: await finish(),
      filename: `etat-des-lieux-${data.reservation.id}-${data.kind}.pdf`,
    }
  }

  /** Passe à la page suivante si `height` points ne tiennent plus. */
  #ensureSpace(doc: PDFKit.PDFDocument, height: number) {
    if (doc.y + height > BOTTOM) {
      doc.addPage()
      doc.y = MARGIN
    }
  }

  #heading(doc: PDFKit.PDFDocument, text: string) {
    this.#ensureSpace(doc, 40)
    doc.fontSize(11).font('Helvetica-Bold').fillColor(NAVY).text(text, MARGIN, doc.y)
    doc.moveDown(0.4)
  }

  #renderStatus(doc: PDFKit.PDFDocument, data: InspectionPdfData, t: Translate, locale: string) {
    const signed = data.lockedAt !== null
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor(signed ? NAVY : CORAL)
      .text(
        signed
          ? t('pdf.signedOn', { date: formatDateTime(data.lockedAt!, locale) })
          : t('pdf.draft'),
        MARGIN,
        doc.y
      )
    doc.moveDown(0.8)
  }

  #renderSummary(doc: PDFKit.PDFDocument, data: InspectionPdfData, t: Translate, locale: string) {
    const startY = doc.y
    const rightX = MARGIN + CONTENT_W / 2
    const colW = CONTENT_W / 2 - 10

    const field = (label: string, value: string, x: number) => {
      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor(GREY_M)
        .text(label, x, doc.y, { width: colW })
      doc.fontSize(9).font('Helvetica').fillColor(GREY_D).text(value, x, doc.y, { width: colW })
      doc.moveDown(0.4)
    }

    doc.y = startY
    field(t('pdf.boat'), data.boat.name, MARGIN)
    field(
      t('pdf.period'),
      t('pdf.periodRange', {
        start: formatDate(data.reservation.startsAt, locale),
        end: formatDate(data.reservation.endsAt, locale),
      }),
      MARGIN
    )
    field(t('fields.performedAt'), formatDateTime(data.performedAt, locale), MARGIN)
    const leftBottom = doc.y

    doc.y = startY
    const contact = [data.client.name, data.client.email, data.client.phone]
      .filter((part): part is string => Boolean(part))
      .join('\n')
    field(t('pdf.client'), contact, rightX)
    field(
      t('pdf.readings'),
      t('pdf.readingsValue', {
        fuel: data.fuelLevel === null ? '—' : `${data.fuelLevel} %`,
        hours: data.engineHours ?? '—',
      }),
      rightX
    )

    doc.y = Math.max(leftBottom, doc.y)
    if (data.notes) {
      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor(GREY_M)
        .text(t('pdf.notes'), MARGIN, doc.y, { width: CONTENT_W })
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(GREY_D)
        .text(data.notes, MARGIN, doc.y, { width: CONTENT_W })
    }
    divider(doc)
  }

  #stateLabel(state: InspectionItemState | null, t: Translate) {
    return t(`checklist.state.${state ?? 'notInspected'}`)
  }

  #stateColor(state: InspectionItemState | null) {
    if (state === 'damage') return CORAL
    if (state === null) return GREY_M
    return GREY_D
  }

  #renderChecklist(doc: PDFKit.PDFDocument, sections: InspectionReportSection[], t: Translate) {
    this.#heading(doc, t('checklist.title'))

    const tally = inspectionReportTally(sections)
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(GREY_M)
      .text(
        t('pdf.tally', {
          ok: String(tally.ok),
          remark: String(tally.remark),
          damage: String(tally.damage),
          notInspected: String(tally.notInspected),
        }),
        MARGIN,
        doc.y
      )
    doc.moveDown(0.6)

    const labelW = CONTENT_W * 0.7
    const stateX = MARGIN + labelW + 10
    const stateW = CONTENT_W - labelW - 10

    for (const section of sections) {
      this.#ensureSpace(doc, 40)
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor(NAVY)
        .text(t(section.titleKey), MARGIN, doc.y)
      doc.moveDown(0.2)

      for (const row of section.rows) {
        const label = t(row.labelKey)
        const labelH = doc.fontSize(8).font('Helvetica').heightOfString(label, { width: labelW })
        const noteH = row.note ? doc.heightOfString(row.note, { width: labelW - 10 }) + 2 : 0
        this.#ensureSpace(doc, labelH + noteH + 6)

        const y = doc.y
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor(GREY_D)
          .text(label, MARGIN, y, { width: labelW })
        const afterLabel = doc.y
        doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .fillColor(this.#stateColor(row.state))
          .text(this.#stateLabel(row.state, t), stateX, y, { width: stateW, align: 'right' })
        doc.y = afterLabel
        if (row.note) {
          doc
            .fontSize(8)
            .font('Helvetica-Oblique')
            .fillColor(GREY_M)
            .text(row.note, MARGIN + 10, doc.y, { width: labelW - 10 })
        }
        doc.rect(MARGIN, doc.y + 2, CONTENT_W, 0.3).fill(GREY_B)
        doc.y += 5
      }
      doc.moveDown(0.4)
    }
    divider(doc)
  }

  /** Retour : relevés et points qui ont changé depuis le départ. */
  #renderComparison(
    doc: PDFKit.PDFDocument,
    data: InspectionPdfData,
    checkinSections: InspectionReportSection[],
    t: Translate
  ) {
    const counterpart = data.counterpart!
    this.#heading(doc, t('comparison.title'))

    const dash = (value: string | number | null, suffix = '') =>
      value === null ? '—' : `${value}${suffix}`
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(GREY_D)
      .text(
        `${t('comparison.fuelLevel')} : ${dash(counterpart.fuelLevel, ' %')} → ${dash(data.fuelLevel, ' %')}`,
        MARGIN,
        doc.y
      )
      .text(
        `${t('comparison.engineHours')} : ${dash(counterpart.engineHours)} → ${dash(data.engineHours)}`,
        MARGIN,
        doc.y
      )
    doc.moveDown(0.5)

    const changes = inspectionReportChanges(
      inspectionReportSections(data.boat.category, counterpart.items),
      checkinSections
    )
    if (changes.length === 0) {
      doc.fontSize(8).font('Helvetica').fillColor(GREY_M).text(t('pdf.noChanges'), MARGIN, doc.y)
    }
    for (const change of changes) {
      const line = t('pdf.change', {
        item: t(change.labelKey),
        before: this.#stateLabel(change.before, t),
        after: this.#stateLabel(change.after, t),
      })
      this.#ensureSpace(doc, 24)
      doc
        .fontSize(8)
        .font(change.degraded ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(change.degraded ? CORAL : GREY_D)
        .text(change.degraded ? `${line} · ${t('checklist.degraded')}` : line, MARGIN, doc.y, {
          width: CONTENT_W,
        })
      if (change.note) {
        doc
          .fontSize(8)
          .font('Helvetica-Oblique')
          .fillColor(GREY_M)
          .text(change.note, MARGIN + 10, doc.y, { width: CONTENT_W - 10 })
      }
      doc.moveDown(0.2)
    }
    divider(doc)
  }

  #renderDefects(doc: PDFKit.PDFDocument, data: InspectionPdfData, t: Translate) {
    this.#heading(doc, t('pdf.defects'))
    if (data.defects.length === 0) {
      doc.fontSize(8).font('Helvetica').fillColor(GREY_M).text(t('pdf.noDefects'), MARGIN, doc.y)
    }
    for (const defect of data.defects) {
      this.#ensureSpace(doc, 24)
      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor(GREY_D)
        .text(`• ${defect.label}`, MARGIN, doc.y, { width: CONTENT_W })
      if (defect.notes) {
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor(GREY_M)
          .text(defect.notes, MARGIN + 10, doc.y, { width: CONTENT_W - 10 })
      }
    }
    divider(doc)
  }

  /** Vignettes en grille de trois ; une image illisible est omise, pas fatale. */
  #renderPhotos(doc: PDFKit.PDFDocument, data: InspectionPdfData, t: Translate) {
    this.#heading(doc, t('pdf.photos'))
    if (data.photoCount === 0) {
      doc.fontSize(8).font('Helvetica').fillColor(GREY_M).text(t('pdf.noPhotos'), MARGIN, doc.y)
      divider(doc)
      return
    }

    const gap = 10
    const cellW = (CONTENT_W - gap * 2) / 3
    const cellH = cellW * 0.75
    let column = 0
    let rendered = 0

    for (const photo of data.photos) {
      if (column === 0) this.#ensureSpace(doc, cellH + gap)
      const x = MARGIN + column * (cellW + gap)
      try {
        doc.image(Buffer.from(photo), x, doc.y, {
          fit: [cellW, cellH],
          align: 'center',
          valign: 'center',
        })
        rendered += 1
      } catch (error) {
        logger.warn({ err: error, inspectionId: data.inspectionId }, 'unreadable inspection photo')
        continue
      }
      column = (column + 1) % 3
      if (column === 0) doc.y += cellH + gap
    }
    if (column !== 0) doc.y += cellH + gap

    const missing = data.photoCount - rendered
    if (missing > 0) {
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(GREY_M)
        .text(t('pdf.morePhotos', { count: String(missing) }), MARGIN, doc.y)
    }
    divider(doc)
  }

  /** Deux cadres côte à côte : le client, puis l'agent. Vides tant que non signé. */
  #renderSignatures(
    doc: PDFKit.PDFDocument,
    data: InspectionPdfData,
    t: Translate,
    locale: string
  ) {
    const boxH = 130
    this.#ensureSpace(doc, boxH + 40)
    this.#heading(doc, t('signature.title'))

    const gap = 20
    const boxW = (CONTENT_W - gap) / 2
    const top = doc.y

    INSPECTION_SIGNATURE_ROLES.forEach((role, index) => {
      const x = MARGIN + index * (boxW + gap)
      const signature = data.signatures.find((entry) => entry.role === role)

      doc.rect(x, top, boxW, boxH).lineWidth(0.5).stroke(GREY_B)
      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor(GREY_M)
        .text(t(`signature.roles.${role}`), x + 8, top + 8, { width: boxW - 16 })

      if (!signature) return

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(GREY_D)
        .text(signature.signerName, x + 8, top + 22, { width: boxW - 16 })
      try {
        doc.image(Buffer.from(signature.image), x + 8, top + 38, {
          fit: [boxW - 16, 70],
          align: 'center',
          valign: 'center',
        })
      } catch (error) {
        logger.warn({ err: error, inspectionId: data.inspectionId }, 'unreadable signature image')
      }
      doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor(GREY_M)
        .text(
          t('pdf.signedOn', { date: formatDateTime(signature.signedAt, locale) }),
          x + 8,
          top + boxH - 16,
          { width: boxW - 16 }
        )
    })

    doc.y = top + boxH + 10
    doc.x = MARGIN
  }
}
