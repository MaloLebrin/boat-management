import { test } from '@japa/runner'
import type Organization from '#models/organization'
import {
  createPdfDocument,
  divider,
  renderBrandedHeader,
  renderPagedFooter,
  resolveBranding,
} from '#services/pdf/document'
import { PDF_COLORS, PDF_PAGE } from '#services/pdf/theme'

const org = (overrides: Partial<Organization>) =>
  ({
    name: 'Marina Nord',
    plan: 'pro',
    appName: null,
    primaryColor: null,
    logoUrl: null,
    ...overrides,
  }) as Organization

test.group('PDF kit (unit)', () => {
  test('createPdfDocument collects the stream and finish() returns a PDF buffer', async ({
    assert,
  }) => {
    const { doc, finish } = createPdfDocument()
    doc.text('Bonjour')

    const buffer = await finish()

    assert.equal(buffer.subarray(0, 4).toString('ascii'), '%PDF')
  })

  test('resolveBranding keeps the organization name and default colour outside white-label', ({
    assert,
  }) => {
    const branding = resolveBranding(
      org({
        plan: 'pro',
        appName: 'Marina App',
        primaryColor: '#336699',
        logoUrl: 'https://x/l.png',
      })
    )

    assert.deepEqual(branding, {
      canWhiteLabel: false,
      primaryColor: PDF_COLORS.defaultPrimary,
      displayName: 'Marina Nord',
      logoUrl: null,
    })
  })

  test('resolveBranding applies app name, colour and logo for an Enterprise organization', ({
    assert,
  }) => {
    const branding = resolveBranding(
      org({
        plan: 'enterprise',
        appName: 'Marina App',
        primaryColor: '#336699',
        logoUrl: 'https://x/l.png',
      })
    )

    assert.deepEqual(branding, {
      canWhiteLabel: true,
      primaryColor: '#336699',
      displayName: 'Marina App',
      logoUrl: 'https://x/l.png',
    })
  })

  test('resolveBranding falls back to the organization name and default colour when unset', ({
    assert,
  }) => {
    const branding = resolveBranding(org({ plan: 'enterprise' }))

    assert.equal(branding.displayName, 'Marina Nord')
    assert.equal(branding.primaryColor, PDF_COLORS.defaultPrimary)
    assert.isNull(branding.logoUrl)
  })

  test('renderBrandedHeader paints the band, the name, the title and the generation date', async ({
    assert,
  }) => {
    const { doc, finish } = createPdfDocument()
    const written: string[] = []
    const original = doc.text.bind(doc)
    doc.text = ((text: string, ...rest: unknown[]) => {
      written.push(text)
      return (original as (...args: unknown[]) => PDFKit.PDFDocument)(text, ...rest)
    }) as typeof doc.text

    await renderBrandedHeader(doc, {
      branding: {
        canWhiteLabel: false,
        primaryColor: '#123456',
        displayName: 'Marina Nord',
        logoUrl: null,
      },
      title: 'Facture FAC-1',
      generatedOn: (date) => `Généré le ${date}`,
      locale: 'fr',
    })
    await finish()

    assert.equal(written[0], 'Marina Nord')
    assert.equal(written[1], 'Facture FAC-1')
    assert.match(written[2], /^Généré le \d/)
  })

  test('renderPagedFooter writes the footer on every buffered page with its number', async ({
    assert,
  }) => {
    const { doc, finish } = createPdfDocument({ bufferPages: true })
    doc.addPage()
    const written: string[] = []
    const original = doc.text.bind(doc)
    doc.text = ((text: string, ...rest: unknown[]) => {
      written.push(text)
      return (original as (...args: unknown[]) => PDFKit.PDFDocument)(text, ...rest)
    }) as typeof doc.text

    renderPagedFooter(doc, (page, total) => `Page ${page}/${total}`)
    await finish()

    assert.deepEqual(written, ['Page 1/2', 'Page 2/2'])
  })

  test('divider draws a hairline across the content width', async ({ assert }) => {
    const { doc, finish } = createPdfDocument()
    const rects: number[][] = []
    const original = doc.rect.bind(doc)
    doc.rect = ((x: number, y: number, w: number, h: number) => {
      rects.push([x, w, h])
      return original(x, y, w, h)
    }) as typeof doc.rect

    divider(doc)
    await finish()

    assert.deepEqual(rects, [[PDF_PAGE.margin, PDF_PAGE.contentWidth, 0.5]])
  })
})
