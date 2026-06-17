import type Boat from '#models/boat'
import type BoatMaintenanceEvent from '#models/boat_maintenance_event'
import { inject } from '@adonisjs/core'
import PDFDocument from 'pdfkit'

type EventRow = {
  id: number
  performedAt: string
  subject: string
  title: string
  notes: string | null
  engineCaption: string | null
  sailCaption: string | null
  parts: Array<{ name: string; quantity: number | null; notes: string | null }>
}

@inject()
export default class MaintenanceLogPdfService {
  async generate(
    boat: Boat,
    events: BoatMaintenanceEvent[]
  ): Promise<{ buffer: Buffer; filename: string }> {
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    const rows: EventRow[] = events
      .map((ev) => ({
        id: ev.id,
        performedAt: ev.performedAt.toISODate()!,
        subject: ev.subject,
        title: ev.title,
        notes: ev.notes,
        engineCaption: ev.engineCaption,
        sailCaption: ev.sailCaption,
        parts: ev.parts.map((p) => ({
          name: p.name,
          quantity: p.quantity,
          notes: p.notes,
        })),
      }))
      .sort((a, b) => a.performedAt.localeCompare(b.performedAt))

    this.#renderHeader(doc, boat)
    this.#renderBoatSpecs(doc, boat)
    this.#renderEvents(doc, rows)

    doc.end()

    await new Promise<void>((resolve) => doc.on('end', resolve))

    const safe = boat.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    return {
      buffer: Buffer.concat(chunks),
      filename: `carnet-entretien-${safe}.pdf`,
    }
  }

  #renderHeader(doc: PDFKit.PDFDocument, boat: Boat): void {
    doc.fontSize(22).font('Helvetica-Bold').text("Carnet d'entretien", { align: 'center' })
    doc.moveDown(0.3)
    doc.fontSize(16).font('Helvetica').text(boat.name, { align: 'center' })
    doc.moveDown(0.2)
    doc
      .fontSize(9)
      .fillColor('#666')
      .text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' })
    doc.fillColor('#000')
    doc.moveDown(1)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').lineWidth(0.5).stroke()
    doc.moveDown(1)
  }

  #renderBoatSpecs(doc: PDFKit.PDFDocument, boat: Boat): void {
    doc.fontSize(12).font('Helvetica-Bold').text('Informations bateau')
    doc.moveDown(0.5)

    const specs: Array<[string, string | null | undefined]> = [
      ['Immatriculation', boat.registrationNumber],
      ['Type', boat.type],
      ['Propulsion', boat.propulsionType],
      ['Constructeur', boat.manufacturer],
      ['Modèle', boat.model],
      ['Longueur', boat.lengthM ? `${boat.lengthM} m` : null],
      ["Port d'attache", boat.homePort],
    ]

    doc.fontSize(9).font('Helvetica')
    for (const [label, value] of specs) {
      if (!value) continue
      doc
        .font('Helvetica-Bold')
        .text(`${label} : `, { continued: true })
        .font('Helvetica')
        .text(value)
    }

    doc.moveDown(1)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').lineWidth(0.5).stroke()
    doc.moveDown(1)
  }

  #renderEvents(doc: PDFKit.PDFDocument, rows: EventRow[]): void {
    doc.fontSize(12).font('Helvetica-Bold').text('Historique des interventions')
    doc.moveDown(0.5)

    if (rows.length === 0) {
      doc.fontSize(9).font('Helvetica').fillColor('#666').text('Aucune intervention enregistrée.')
      doc.fillColor('#000')
      return
    }

    for (const ev of rows) {
      if (doc.y > 700) doc.addPage()

      const subjectLabel = this.#subjectLabel(ev)

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#111')
      doc.text(`${ev.performedAt}  —  ${ev.title}`, { continued: false })

      doc.fontSize(8).font('Helvetica').fillColor('#555').text(`Sujet : ${subjectLabel}`)

      if (ev.notes) {
        doc.fillColor('#333').text(ev.notes, { width: 495 })
      }

      if (ev.parts.length > 0) {
        doc.moveDown(0.3)
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#333').text('Pièces :')
        for (const part of ev.parts) {
          const qty = part.quantity ? ` ×${part.quantity}` : ''
          const note = part.notes ? ` — ${part.notes}` : ''
          doc
            .fontSize(8)
            .font('Helvetica')
            .fillColor('#444')
            .text(`  • ${part.name}${qty}${note}`, { indent: 8 })
        }
      }

      doc.fillColor('#000')
      doc.moveDown(0.8)
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#eee').lineWidth(0.5).stroke()
      doc.moveDown(0.5)
    }
  }

  #subjectLabel(ev: EventRow): string {
    const map: Record<string, string> = {
      boat: 'Bateau entier',
      hull: 'Coque',
      engine: ev.engineCaption ?? 'Moteur',
      sail: ev.sailCaption ?? 'Voile',
      rig: 'Gréement',
      electrical: 'Électricité',
      plumbing: 'Plomberie',
      safety: 'Sécurité',
      deck: 'Pont / Accastillage',
      other: 'Autre',
    }
    return map[ev.subject] ?? ev.subject
  }
}
