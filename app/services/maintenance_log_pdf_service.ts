import type Boat from '#models/boat'
import type BoatEngine from '#models/boat_engine'
import type BoatEnginePart from '#models/boat_engine_part'
import type BoatMaintenanceEvent from '#models/boat_maintenance_event'
import type BoatRig from '#models/boat_rig'
import type BoatSafetyEquipment from '#models/boat_safety_equipment'
import type BoatSail from '#models/boat_sail'
import app from '@adonisjs/core/services/app'
import type { I18n } from '@adonisjs/i18n'
import PDFDocument from 'pdfkit'

type EventRow = {
  id: number
  performedAt: string
  subject: string
  title: string
  notes: string | null
  engineCaption: string | null
  sailCaption: string | null
  safetyCaption: string | null
  boatEngineId: number | null
  boatSailId: number | null
  boatRigId: number | null
  boatSafetyEquipmentId: number | null
  parts: Array<{ name: string; quantity: number | null; notes: string | null }>
}

const NAVY = '#0b1d2e'
const CORAL = '#e2674f'
const GREY_B = '#e0e0e0'
const GREY_M = '#888888'
const GREY_D = '#333333'
const WHITE = '#ffffff'

const PAGE_W = 595.28
const MARGIN = 48
const CONTENT_W = PAGE_W - MARGIN * 2

function mechanicalEquipmentStatusColor(status: string | null | undefined): string {
  if (status === 'operational') return '#2e7d32'
  if (status === 'in_maintenance') return '#e65100'
  if (status === 'out_of_service' || status === 'retired') return CORAL
  return GREY_M
}

export default class MaintenanceLogPdfService {
  async generate(
    boat: Boat,
    events: BoatMaintenanceEvent[],
    i18n: I18n
  ): Promise<{ buffer: Buffer; filename: string }> {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    const t = (key: string, data?: Record<string, string>) =>
      i18n.t(`boats.maintenanceLog.${key}`, data)

    const tOpt = (ns: string, key: string) => i18n.t(`boats.options.${ns}.${key}`)

    const safety = this.#castSafety(boat)
    const safetyMap = new Map(safety.map((s) => [s.id, s]))

    const rows: EventRow[] = events.map((ev) => {
      const safetyItem = ev.boatSafetyEquipmentId ? safetyMap.get(ev.boatSafetyEquipmentId) : null
      return {
        id: ev.id,
        performedAt: ev.performedAt.toISODate()!,
        subject: ev.subject,
        title: ev.title,
        notes: ev.notes,
        engineCaption: ev.engineCaption,
        sailCaption: ev.sailCaption,
        safetyCaption: safetyItem ? tOpt('safetyEquipmentType', safetyItem.equipmentType) : null,
        boatEngineId: ev.boatEngineId,
        boatSailId: ev.boatSailId,
        boatRigId: ev.boatRigId,
        boatSafetyEquipmentId: ev.boatSafetyEquipmentId,
        parts: ev.parts.map((p) => ({
          name: p.name,
          quantity: p.quantity,
          notes: p.notes,
        })),
      }
    })

    this.#renderHeader(doc, boat, t)
    this.#renderBoatSpecs(doc, boat, t, tOpt)
    this.#renderEquipment(doc, boat, rows, t, tOpt)
    this.#renderInventory(doc, boat, t, tOpt)
    this.#renderEvents(doc, rows, t)
    this.#renderHistoryByEquipment(doc, boat, rows, t, tOpt)

    doc.end()

    await new Promise<void>((resolve) => doc.on('end', resolve))

    const safe = boat.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    return {
      buffer: Buffer.concat(chunks),
      filename: `${t('title').toLowerCase().replace(/\s+/g, '-')}-${safe}.pdf`,
    }
  }

  // ─── Layout helpers ────────────────────────────────────────────────────────

  #renderHeader(
    doc: PDFKit.PDFDocument,
    boat: Boat,
    t: (key: string, data?: Record<string, string>) => string
  ): void {
    const HEADER_H = 118

    doc.rect(0, 0, PAGE_W, HEADER_H).fill(NAVY)

    try {
      const logoPath = app.publicPath('web-app-manifest-192x192.png')
      doc.image(logoPath, MARGIN, 22, { width: 62, height: 62 })
    } catch {
      // Logo file unavailable — skip
    }

    const TX = MARGIN + 78
    doc.fillColor(WHITE).fontSize(18).font('Helvetica-Bold').text('FleetView', TX, 25)
    doc.fillColor(CORAL).fontSize(10).font('Helvetica').text(t('title'), TX, 49)
    doc.fillColor(WHITE).fontSize(20).font('Helvetica-Bold').text(boat.name, TX, 67)
    doc
      .fillColor(GREY_M)
      .fontSize(8)
      .font('Helvetica')
      .text(t('generatedOn', { date: new Date().toLocaleDateString() }), TX, 97)

    doc.rect(0, HEADER_H, PAGE_W, 3).fill(CORAL)
    doc.text('', MARGIN, HEADER_H + 3 + 20)
    doc.fillColor('#000')
  }

  #sectionBand(doc: PDFKit.PDFDocument, label: string): void {
    if (doc.y > 760) doc.addPage()
    const y = doc.y
    doc.rect(MARGIN - 12, y, CONTENT_W + 24, 22).fill(NAVY)
    doc
      .fillColor(WHITE)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text(label.toUpperCase(), MARGIN, y + 7, { width: CONTENT_W, characterSpacing: 0.5 })
    doc.fillColor('#000')
    doc.text('', MARGIN, y + 22 + 12)
  }

  #subSectionLabel(doc: PDFKit.PDFDocument, label: string): void {
    if (doc.y > 760) doc.addPage()
    const y = doc.y
    doc.rect(MARGIN - 12, y, CONTENT_W + 24, 18).fill('#1a2f42')
    doc
      .fillColor(CORAL)
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .text(label, MARGIN, y + 5, { width: CONTENT_W })
    doc.fillColor('#000')
    doc.text('', MARGIN, y + 18 + 8)
  }

  /** Two-column spec rows: each pair on one line */
  #specRows(doc: PDFKit.PDFDocument, specs: Array<[string, string]>): void {
    const LABEL_W = 90
    const COL_GAP = 20
    const COL_W = (CONTENT_W - COL_GAP) / 2
    const VALUE_W = COL_W - LABEL_W - 4

    for (let i = 0; i < specs.length; i += 2) {
      const rowY = doc.y
      const [l0, v0] = specs[i]

      doc.fontSize(8).font('Helvetica-Bold').fillColor(NAVY).text(l0, MARGIN, rowY, {
        width: LABEL_W,
        lineBreak: false,
      })
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(GREY_D)
        .text(v0, MARGIN + LABEL_W + 4, rowY, {
          width: VALUE_W,
          lineBreak: false,
        })

      if (i + 1 < specs.length) {
        const [l1, v1] = specs[i + 1]
        const col1X = MARGIN + COL_W + COL_GAP
        doc.fontSize(8).font('Helvetica-Bold').fillColor(NAVY).text(l1, col1X, rowY, {
          width: LABEL_W,
          lineBreak: false,
        })
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor(GREY_D)
          .text(v1, col1X + LABEL_W + 4, rowY, {
            width: VALUE_W,
            lineBreak: false,
          })
      }

      doc.text('', MARGIN, rowY + 14)
    }
    doc.fillColor('#000')
  }

  #divider(doc: PDFKit.PDFDocument, gap = 0.8): void {
    doc.moveDown(0.4)
    doc.rect(MARGIN, doc.y, CONTENT_W, 0.5).fill(GREY_B)
    doc.moveDown(gap)
  }

  // ─── Boat specs ────────────────────────────────────────────────────────────

  #renderBoatSpecs(
    doc: PDFKit.PDFDocument,
    boat: Boat,
    t: (key: string, data?: Record<string, string>) => string,
    tOpt: (ns: string, key: string) => string
  ): void {
    this.#sectionBand(doc, t('boatInfo'))

    const propulsion = boat.propulsionType ? tOpt('propulsion', boat.propulsionType) : null

    const specs: Array<[string, string]> = (
      [
        [t('specs.registration'), boat.registrationNumber],
        [t('specs.type'), boat.type],
        [t('specs.propulsion'), propulsion],
        [t('specs.manufacturer'), boat.manufacturer],
        [t('specs.model'), boat.model],
        [
          t('specs.lengthLabel'),
          boat.lengthM ? t('specs.length', { value: String(boat.lengthM) }) : null,
        ],
        [t('specs.homePort'), boat.homePort],
      ] as Array<[string, string | null | undefined]>
    ).filter(([, v]) => v !== null) as Array<[string, string]>

    this.#specRows(doc, specs)
    this.#divider(doc)
  }

  // ─── Equipment ─────────────────────────────────────────────────────────────

  #renderEquipment(
    doc: PDFKit.PDFDocument,
    boat: Boat,
    _rows: EventRow[],
    t: (key: string, data?: Record<string, string>) => string,
    tOpt: (ns: string, key: string) => string
  ): void {
    const engines: BoatEngine[] = (boat.engines as unknown as BoatEngine[]) ?? []
    const sails: BoatSail[] = (boat.sails as unknown as BoatSail[]) ?? []
    const rig: BoatRig | null = (boat.rig as unknown as BoatRig) ?? null
    const safety = this.#castSafety(boat)

    if (engines.length === 0 && sails.length === 0 && !rig && safety.length === 0) return

    // ── Moteurs ─────────────────────────────────────────────────────────────
    if (engines.length > 0) {
      this.#sectionBand(doc, t('sectionEngines'))
      for (const engine of engines) {
        const label = [engine.brand, engine.model].filter(Boolean).join(' ') || engine.kind
        this.#subSectionLabel(doc, label)

        const kind = engine.kind ? tOpt('engineKind', engine.kind) : null
        const fuel = engine.fuel ? tOpt('engineFuel', engine.fuel) : null

        const specs: Array<[string, string]> = (
          [
            [t('engineFields.kind'), kind],
            [t('engineFields.fuel'), fuel],
            [
              t('engineFields.power'),
              engine.powerHp ? t('engineFields.hp', { value: String(engine.powerHp) }) : null,
            ],
            [
              t('engineFields.hours'),
              engine.hours !== null
                ? t('engineFields.hoursUnit', { value: String(engine.hours) })
                : null,
            ],
            [t('engineFields.serial'), engine.serialNumber],
            [
              t('engineFields.installYear'),
              engine.manufacturedAt ? String(engine.manufacturedAt.year) : null,
            ],
          ] as Array<[string, string | null | undefined]>
        ).filter(([, v]) => v !== null) as Array<[string, string]>

        this.#specRows(doc, specs)
        doc.moveDown(0.4)
      }
      this.#divider(doc)
    }

    // ── Voilure ─────────────────────────────────────────────────────────────
    if (sails.length > 0) {
      this.#sectionBand(doc, t('sectionSails'))
      for (const sail of sails) {
        const sailTypeLabel = tOpt('sailType', sail.sailType)
        this.#subSectionLabel(doc, sailTypeLabel)

        const specs: Array<[string, string]> = (
          [
            [t('sailFields.material'), sail.material],
            [
              t('sailFields.area'),
              sail.areaM2 !== null
                ? t('sailFields.areaUnit', { value: String(sail.areaM2) })
                : null,
            ],
            [t('sailFields.reefPoints'), sail.reefPoints !== null ? String(sail.reefPoints) : null],
          ] as Array<[string, string | null | undefined]>
        ).filter(([, v]) => v !== null) as Array<[string, string]>

        if (specs.length > 0) {
          this.#specRows(doc, specs)
        }
        doc.moveDown(0.4)
      }
      this.#divider(doc)
    }

    // ── Gréement ────────────────────────────────────────────────────────────
    if (rig) {
      this.#sectionBand(doc, t('sectionRig'))
      const rigTypeLabel = tOpt('rigType', rig.rigType)
      this.#subSectionLabel(doc, rigTypeLabel)

      const specs: Array<[string, string]> = (
        [
          [t('rigFields.mastCount'), rig.mastCount !== null ? String(rig.mastCount) : null],
          [t('rigFields.spreaders'), rig.spreaders !== null ? String(rig.spreaders) : null],
          [t('rigFields.type'), rig.manufacturedAt ? String(rig.manufacturedAt.year) : null],
        ] as Array<[string, string | null | undefined]>
      ).filter(([, v]) => v !== null) as Array<[string, string]>

      if (specs.length > 0) {
        this.#specRows(doc, specs)
      }
      this.#divider(doc)
    }

    // ── Armement de sécurité ─────────────────────────────────────────────────
    if (safety.length > 0) {
      this.#sectionBand(doc, t('sectionSafety'))
      this.#renderSafetyTable(doc, safety, t, tOpt)
      this.#divider(doc)
    }
  }

  #renderSafetyTable(
    doc: PDFKit.PDFDocument,
    items: BoatSafetyEquipment[],
    t: (key: string, data?: Record<string, string>) => string,
    tOpt: (ns: string, key: string) => string
  ): void {
    // Column widths
    const C_TYPE = 200
    const C_QTY = 50
    const C_EXPIRY = 110
    const C_STATUS = CONTENT_W - C_TYPE - C_QTY - C_EXPIRY

    const drawRow = (
      y: number,
      type: string,
      qty: string,
      expiry: string,
      status: string,
      isHeader: boolean
    ) => {
      const font = isHeader ? 'Helvetica-Bold' : 'Helvetica'
      const color = isHeader ? WHITE : GREY_D
      if (isHeader) {
        doc.rect(MARGIN - 12, y - 3, CONTENT_W + 24, 18).fill('#1a2f42')
      }
      doc.fontSize(8).font(font).fillColor(color)
      doc.text(type, MARGIN, y, { width: C_TYPE - 4, lineBreak: false })
      doc.text(qty, MARGIN + C_TYPE, y, { width: C_QTY - 4, lineBreak: false })
      doc.text(expiry, MARGIN + C_TYPE + C_QTY, y, { width: C_EXPIRY - 4, lineBreak: false })
      doc.text(status, MARGIN + C_TYPE + C_QTY + C_EXPIRY, y, {
        width: C_STATUS,
        lineBreak: false,
      })
      doc.fillColor('#000')
    }

    // Header row
    const headerY = doc.y
    drawRow(
      headerY,
      t('safetyFields.type'),
      t('safetyFields.quantity'),
      t('safetyFields.expiry'),
      t('safetyFields.status'),
      true
    )
    doc.text('', MARGIN, headerY + 18)

    // Data rows
    for (const item of items) {
      if (doc.y > 760) doc.addPage()
      const rowY = doc.y
      const typeLabel = tOpt('safetyEquipmentType', item.equipmentType)
      const qty = item.quantity !== null ? String(item.quantity) : '—'
      const expiry = item.expiryDate ? item.expiryDate.toISODate()! : t('safetyFields.noExpiry')
      const statusLabel =
        item.status === 'ok'
          ? t('statusOk')
          : item.status === 'to_check'
            ? t('statusToCheck')
            : item.status === 'expired'
              ? t('statusExpired')
              : '—'

      drawRow(rowY, typeLabel, qty, expiry, statusLabel, false)

      // Status color dot
      const dotColor =
        item.status === 'ok'
          ? '#2e7d32'
          : item.status === 'to_check'
            ? '#e65100'
            : item.status === 'expired'
              ? CORAL
              : GREY_D
      doc.circle(MARGIN + C_TYPE + C_QTY + C_EXPIRY - 10, rowY + 4, 3).fill(dotColor)

      doc.rect(MARGIN, rowY + 10, CONTENT_W, 0.5).fill(GREY_B)
      doc.text('', MARGIN, rowY + 13)
    }
  }

  // ─── Global history ────────────────────────────────────────────────────────

  #renderEvents(
    doc: PDFKit.PDFDocument,
    rows: EventRow[],
    t: (key: string, data?: Record<string, string>) => string
  ): void {
    if (doc.y > 700) doc.addPage()
    this.#sectionBand(doc, t('history'))

    if (rows.length === 0) {
      doc.fontSize(9).font('Helvetica').fillColor(GREY_M).text(t('noEvents'))
      doc.fillColor('#000')
      return
    }

    this.#eventList(doc, rows, t)
  }

  // ─── History by equipment ──────────────────────────────────────────────────

  #renderHistoryByEquipment(
    doc: PDFKit.PDFDocument,
    boat: Boat,
    rows: EventRow[],
    t: (key: string, data?: Record<string, string>) => string,
    tOpt: (ns: string, key: string) => string
  ): void {
    const engines: BoatEngine[] = (boat.engines as unknown as BoatEngine[]) ?? []
    const sails: BoatSail[] = (boat.sails as unknown as BoatSail[]) ?? []
    const rig: BoatRig | null = (boat.rig as unknown as BoatRig) ?? null
    const safety = this.#castSafety(boat)

    const engineEvents = rows.filter((r) => r.boatEngineId !== null)
    const sailEvents = rows.filter((r) => r.boatSailId !== null)
    const rigEvents = rows.filter((r) => r.boatRigId !== null)
    const safetyEvents = rows.filter((r) => r.boatSafetyEquipmentId !== null)

    if (
      engineEvents.length === 0 &&
      sailEvents.length === 0 &&
      rigEvents.length === 0 &&
      safetyEvents.length === 0
    )
      return

    if (doc.y > 700) doc.addPage()
    this.#sectionBand(doc, t('sectionHistoryByEquipment'))

    // Per engine
    for (const engine of engines) {
      const evs = rows.filter((r) => r.boatEngineId === engine.id)
      if (evs.length === 0) continue
      const label = [engine.brand, engine.model].filter(Boolean).join(' ') || `#${engine.id}`
      this.#subSectionLabel(doc, t('historyFor', { name: label }))
      this.#eventList(doc, evs, t)
    }

    // Per sail
    for (const sail of sails) {
      const evs = rows.filter((r) => r.boatSailId === sail.id)
      if (evs.length === 0) continue
      const label = tOpt('sailType', sail.sailType)
      this.#subSectionLabel(doc, t('historyFor', { name: label }))
      this.#eventList(doc, evs, t)
    }

    // Rig
    if (rig && rigEvents.length > 0) {
      this.#subSectionLabel(doc, t('historyFor', { name: tOpt('rigType', rig.rigType) }))
      this.#eventList(doc, rigEvents, t)
    }

    // Per safety equipment item
    for (const item of safety) {
      const evs = rows.filter((r) => r.boatSafetyEquipmentId === item.id)
      if (evs.length === 0) continue
      const label = tOpt('safetyEquipmentType', item.equipmentType)
      this.#subSectionLabel(doc, t('historyFor', { name: label }))
      this.#eventList(doc, evs, t)
    }
  }

  // ─── Shared event list renderer ────────────────────────────────────────────

  #eventList(
    doc: PDFKit.PDFDocument,
    rows: EventRow[],
    t: (key: string, data?: Record<string, string>) => string
  ): void {
    const TEXT_X = MARGIN + 10

    for (const ev of rows) {
      if (doc.y > 740) doc.addPage()

      const startY = doc.y
      const subjectLabel = this.#subjectLabel(ev, t)

      doc
        .fontSize(9.5)
        .font('Helvetica-Bold')
        .fillColor(NAVY)
        .text(ev.performedAt, TEXT_X, startY, { continued: true })
      doc.fillColor(GREY_D).text(`  —  ${ev.title}`)

      doc
        .fontSize(7.5)
        .font('Helvetica')
        .fillColor(GREY_M)
        .text(t('subject', { label: subjectLabel }), TEXT_X, doc.y)

      if (ev.notes) {
        doc.moveDown(0.2)
        doc
          .fontSize(8.5)
          .font('Helvetica')
          .fillColor(GREY_D)
          .text(ev.notes, TEXT_X, doc.y, { width: CONTENT_W - 10 })
      }

      if (ev.parts.length > 0) {
        doc.moveDown(0.25)
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(GREY_D).text(t('parts'), TEXT_X)
        for (const part of ev.parts) {
          const qty = part.quantity ? ` ×${part.quantity}` : ''
          const note = part.notes ? ` — ${part.notes}` : ''
          doc
            .fontSize(7.5)
            .font('Helvetica')
            .fillColor(GREY_M)
            .text(`  • ${part.name}${qty}${note}`, TEXT_X + 6, doc.y, {
              width: CONTENT_W - 16,
            })
        }
      }

      const endY = doc.y

      // Left coral accent bar
      doc.rect(MARGIN - 10, startY - 2, 3, endY - startY + 6).fill(CORAL)

      doc.fillColor('#000')
      doc.moveDown(0.4)
      doc.rect(MARGIN, doc.y, CONTENT_W, 0.5).fill(GREY_B)
      doc.moveDown(0.6)
    }
  }

  #subjectLabel(ev: EventRow, t: (key: string, data?: Record<string, string>) => string): string {
    const key = `subjects.${ev.subject}`
    const translated = t(key)
    if (
      translated === key ||
      translated.startsWith('translation missing:') ||
      translated.startsWith('boats.maintenanceLog.')
    ) {
      return ev.engineCaption ?? ev.sailCaption ?? ev.safetyCaption ?? ev.subject
    }
    if (ev.subject === 'engine' && ev.engineCaption) return ev.engineCaption
    if (ev.subject === 'sail' && ev.sailCaption) return ev.sailCaption
    if (ev.subject === 'safety' && ev.safetyCaption) return ev.safetyCaption
    return translated
  }

  // ─── Inventory ─────────────────────────────────────────────────────────────

  #renderInventory(
    doc: PDFKit.PDFDocument,
    boat: Boat,
    t: (key: string, data?: Record<string, string>) => string,
    tOpt: (ns: string, key: string) => string
  ): void {
    const engines: BoatEngine[] = (boat.engines as unknown as BoatEngine[]) ?? []
    const sails: BoatSail[] = (boat.sails as unknown as BoatSail[]) ?? []
    const rig: BoatRig | null = (boat.rig as unknown as BoatRig) ?? null
    const safety = this.#castSafety(boat)

    if (engines.length === 0 && sails.length === 0 && !rig && safety.length === 0) return

    if (doc.y > 700) doc.addPage()
    this.#sectionBand(doc, t('sectionInventory'))

    // ── Status board (engines + sails + rig) ────────────────────────────────
    this.#subSectionLabel(doc, t('inventoryStatus'))
    this.#renderStatusBoard(doc, engines, sails, rig, safety, t, tOpt)
    this.#divider(doc)

    // ── Engine parts stock ─────────────────────────────────────────────────
    const enginesWithParts = engines.filter(
      (e) => ((e.parts as unknown as BoatEnginePart[]) ?? []).length > 0
    )
    if (enginesWithParts.length > 0) {
      this.#subSectionLabel(doc, t('inventoryParts'))
      for (const engine of enginesWithParts) {
        const engineLabel =
          [engine.brand, engine.model].filter(Boolean).join(' ') || `#${engine.id}`
        const parts = (engine.parts as unknown as BoatEnginePart[]) ?? []
        this.#renderEnginePartsTable(doc, engineLabel, parts, t, tOpt)
        doc.moveDown(0.4)
      }
      this.#divider(doc)
    }
  }

  #renderStatusBoard(
    doc: PDFKit.PDFDocument,
    engines: BoatEngine[],
    sails: BoatSail[],
    rig: BoatRig | null,
    safety: BoatSafetyEquipment[],
    t: (key: string, data?: Record<string, string>) => string,
    tOpt: (ns: string, key: string) => string
  ): void {
    const C_NAME = 220
    const C_TYPE = 140
    const C_STATUS = CONTENT_W - C_NAME - C_TYPE

    const drawRow = (y: number, name: string, type: string, status: string, isHeader: boolean) => {
      const font = isHeader ? 'Helvetica-Bold' : 'Helvetica'
      const color = isHeader ? WHITE : GREY_D
      if (isHeader) {
        doc.rect(MARGIN - 12, y - 3, CONTENT_W + 24, 18).fill('#1a2f42')
      }
      doc.fontSize(8).font(font).fillColor(color)
      doc.text(name, MARGIN, y, { width: C_NAME - 4, lineBreak: false })
      doc.text(type, MARGIN + C_NAME, y, { width: C_TYPE - 4, lineBreak: false })
      doc.text(status, MARGIN + C_NAME + C_TYPE, y, { width: C_STATUS, lineBreak: false })
      doc.fillColor('#000')
    }

    const headerY = doc.y
    drawRow(
      headerY,
      t('inventoryFields.name'),
      t('inventoryFields.type'),
      t('inventoryFields.status'),
      true
    )
    doc.text('', MARGIN, headerY + 18)

    const rows: Array<[string, string, string, string]> = []

    for (const engine of engines) {
      const name = [engine.brand, engine.model].filter(Boolean).join(' ') || `#${engine.id}`
      const type = engine.kind ? tOpt('engineKind', engine.kind) : t('inventoryFields.engine')
      const status = engine.status ? tOpt('equipmentStatus', engine.status) : '—'
      rows.push([name, type, status, mechanicalEquipmentStatusColor(engine.status)])
    }

    for (const sail of sails) {
      const name = tOpt('sailType', sail.sailType)
      const material = sail.material ?? '—'
      const status = sail.status ? tOpt('equipmentStatus', sail.status) : '—'
      rows.push([name, material, status, mechanicalEquipmentStatusColor(sail.status)])
    }

    if (rig) {
      const name = tOpt('rigType', rig.rigType)
      const type = t('sectionRig')
      const status = rig.status ? tOpt('equipmentStatus', rig.status) : '—'
      rows.push([name, type, status, mechanicalEquipmentStatusColor(rig.status)])
    }

    for (const item of safety) {
      const name = tOpt('safetyEquipmentType', item.equipmentType)
      const statusLabel =
        item.status === 'ok'
          ? t('statusOk')
          : item.status === 'to_check'
            ? t('statusToCheck')
            : item.status === 'expired'
              ? t('statusExpired')
              : '—'
      const statusColor =
        item.status === 'ok'
          ? '#2e7d32'
          : item.status === 'to_check'
            ? '#e65100'
            : item.status === 'expired'
              ? CORAL
              : GREY_M
      rows.push([name, t('sectionSafety'), statusLabel, statusColor])
    }

    for (const [name, type, status, dotColor] of rows) {
      if (doc.y > 760) doc.addPage()
      const rowY = doc.y
      drawRow(rowY, name, type, status, false)
      doc.circle(MARGIN + C_NAME + C_TYPE - 10, rowY + 4, 3).fill(dotColor)
      doc.rect(MARGIN, rowY + 10, CONTENT_W, 0.5).fill(GREY_B)
      doc.text('', MARGIN, rowY + 13)
    }
  }

  #renderEnginePartsTable(
    doc: PDFKit.PDFDocument,
    engineLabel: string,
    parts: BoatEnginePart[],
    t: (key: string, data?: Record<string, string>) => string,
    tOpt: (ns: string, key: string) => string
  ): void {
    const C_NAME = 200
    const C_REF = 110
    const C_STOCK = 60
    const C_WEAR = CONTENT_W - C_NAME - C_REF - C_STOCK

    doc.fontSize(8).font('Helvetica-Bold').fillColor(NAVY).text(engineLabel, MARGIN, doc.y)
    doc.text('', MARGIN, doc.y + 4)

    const drawRow = (
      y: number,
      name: string,
      ref: string,
      stock: string,
      wear: string,
      isHeader: boolean,
      stockColor?: string
    ) => {
      const font = isHeader ? 'Helvetica-Bold' : 'Helvetica'
      const color = isHeader ? WHITE : GREY_D
      if (isHeader) {
        doc.rect(MARGIN - 12, y - 3, CONTENT_W + 24, 18).fill('#1a2f42')
      }
      doc.fontSize(7.5).font(font).fillColor(color)
      doc.text(name, MARGIN, y, { width: C_NAME - 4, lineBreak: false })
      doc.text(ref, MARGIN + C_NAME, y, { width: C_REF - 4, lineBreak: false })
      doc.fillColor(stockColor ?? color)
      doc.text(stock, MARGIN + C_NAME + C_REF, y, { width: C_STOCK - 4, lineBreak: false })
      doc.fillColor(color)
      doc.text(wear, MARGIN + C_NAME + C_REF + C_STOCK, y, { width: C_WEAR, lineBreak: false })
      doc.fillColor('#000')
    }

    const headerY = doc.y
    drawRow(
      headerY,
      t('partsFields.designation'),
      t('partsFields.reference'),
      t('partsFields.stock'),
      t('partsFields.wear'),
      true
    )
    doc.text('', MARGIN, headerY + 18)

    for (const part of parts) {
      if (doc.y > 760) doc.addPage()
      const rowY = doc.y
      const wearLabel = part.wearState ? tOpt('partWearState', part.wearState) : '—'
      const stockStr = part.stock !== null ? String(part.stock) : '—'
      const alert =
        part.minStockAlert !== null && part.stock !== null && part.stock <= part.minStockAlert
      const stockColor = alert ? CORAL : undefined

      if (alert) doc.circle(MARGIN + C_NAME + C_REF - 6, rowY + 4, 3).fill(CORAL)
      drawRow(rowY, part.designation, part.reference ?? '—', stockStr, wearLabel, false, stockColor)

      doc.rect(MARGIN, rowY + 10, CONTENT_W, 0.5).fill(GREY_B)
      doc.text('', MARGIN, rowY + 13)
    }
  }

  #castSafety(boat: Boat): BoatSafetyEquipment[] {
    return (boat.safetyEquipment as unknown as BoatSafetyEquipment[]) ?? []
  }
}
