import PDFDocument from 'pdfkit'
import type Organization from '#models/organization'
import { formatDate } from '#shared/helpers/date_format'
import { PLAN_LIMITS } from '#shared/types/plan'
import { PDF_COLORS, PDF_PAGE } from '#services/pdf/theme'

const { coral: CORAL, greyB: GREY_B, greyM: GREY_M, white: WHITE } = PDF_COLORS
const { width: PAGE_W, height: PAGE_H, margin: MARGIN, contentWidth: CONTENT_W } = PDF_PAGE

/**
 * Document A4 aux marges du thème, dont le flux est collecté en mémoire.
 * `finish()` clôt le document et rend le PDF complet.
 */
export function createPdfDocument(options: { bufferPages?: boolean } = {}): {
  doc: PDFKit.PDFDocument
  finish: () => Promise<Buffer>
} {
  const doc = new PDFDocument({ margin: MARGIN, size: 'A4', ...options })
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  return {
    doc,
    finish: async () => {
      doc.end()
      await new Promise<void>((resolve) => doc.on('end', resolve))
      return Buffer.concat(chunks)
    },
  }
}

/** Marque appliquée à un document d'organisation : nom, couleur, logo (marque blanche Entreprise). */
export interface PdfBranding {
  canWhiteLabel: boolean
  primaryColor: string
  displayName: string
  logoUrl: string | null
}

export function resolveBranding(org: Organization): PdfBranding {
  const canWhiteLabel = PLAN_LIMITS[org.plan].canWhiteLabel
  return {
    canWhiteLabel,
    primaryColor: canWhiteLabel && org.primaryColor ? org.primaryColor : PDF_COLORS.defaultPrimary,
    displayName: canWhiteLabel && org.appName ? org.appName : org.name,
    logoUrl: canWhiteLabel && org.logoUrl ? org.logoUrl : null,
  }
}

/**
 * Bandeau d'en-tête d'un document d'organisation (facture, contrat) :
 * aplat à la couleur de marque, logo si marque blanche, nom, titre du
 * document en corail, date de génération, puis liseré corail.
 */
export async function renderBrandedHeader(
  doc: PDFKit.PDFDocument,
  options: {
    branding: PdfBranding
    title: string
    generatedOn: (date: string) => string
    locale: string
  }
): Promise<void> {
  const HEADER_H = 100
  const { branding } = options

  doc.rect(0, 0, PAGE_W, HEADER_H).fill(branding.primaryColor)

  let textX = MARGIN
  if (branding.logoUrl) {
    try {
      const res = await fetch(branding.logoUrl)
      const buf = Buffer.from(await res.arrayBuffer())
      doc.image(buf, MARGIN, 20, { width: 60 })
      textX = MARGIN + 76
    } catch {
      // Logo inaccessible : on continue sans.
    }
  }

  doc.fillColor(WHITE).fontSize(18).font('Helvetica-Bold').text(branding.displayName, textX, 25)
  doc.fillColor(CORAL).fontSize(12).font('Helvetica').text(options.title, textX, 50)
  doc
    .fillColor(GREY_M)
    .fontSize(8)
    .font('Helvetica')
    .text(options.generatedOn(formatDate(new Date(), options.locale)), textX, 75)

  doc.rect(0, HEADER_H, PAGE_W, 3).fill(CORAL)
  doc.text('', MARGIN, HEADER_H + 3 + 20)
  doc.fillColor('#000')
}

/**
 * Pied de page centré sur chaque page du document (nécessite
 * `bufferPages: true`). `text` reçoit le numéro de page et le total.
 */
export function renderPagedFooter(
  doc: PDFKit.PDFDocument,
  text: (page: number, total: number) => string
): void {
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor(GREY_M)
      .text(text(i - range.start + 1, range.count), MARGIN, PAGE_H - MARGIN / 2, {
        width: CONTENT_W,
        align: 'center',
      })
  }
}

/** Filet horizontal gris sur toute la largeur utile, suivi d'un espace. */
export function divider(doc: PDFKit.PDFDocument, gap = 0.8): void {
  doc.moveDown(0.4)
  doc.rect(MARGIN, doc.y, CONTENT_W, 0.5).fill(GREY_B)
  doc.moveDown(gap)
}
