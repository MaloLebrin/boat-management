import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import i18nManager from '@adonisjs/i18n/services/main'
import Organization from '#models/organization'
import InspectionPdfService from '#services/inspection_pdf_service'
import { decodeSignature } from '#services/inspection_document_service'
import { BoatInspectionValidationError } from '#exceptions/inspection_errors'
import type { InspectionPdfData } from '#shared/types/inspection'

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
const PNG = Buffer.from(PNG_BASE64, 'base64')

function organization() {
  return Object.assign(new Organization(), { name: 'Voiles du Ponant', plan: 'pro' })
}

function data(overrides: Partial<InspectionPdfData> = {}): InspectionPdfData {
  return {
    inspectionId: 7,
    kind: 'checkout',
    performedAt: '2026-07-01T08:00:00.000Z',
    fuelLevel: 90,
    engineHours: '1234.5',
    notes: 'Remis avec le plein.',
    lockedAt: null,
    boat: { name: 'Albatros', category: 'sailboat_monohull' },
    reservation: {
      id: 3,
      startsAt: '2026-07-01T08:00:00.000Z',
      endsAt: '2026-07-08T18:00:00.000Z',
    },
    client: { name: 'Alice Martin', email: 'alice@example.com', phone: null },
    items: [{ itemKey: 'hull_deck.hull_condition', state: 'damage', note: 'Rayure bâbord' }],
    photos: [],
    photoCount: 0,
    defects: [{ label: 'Hublot fêlé', notes: null }],
    counterpart: null,
    signatures: [],
    ...overrides,
  }
}

async function render(input: InspectionPdfData) {
  const service = await app.container.make(InspectionPdfService)
  return service.generate(input, organization(), i18nManager.locale('fr'))
}

test.group('InspectionPdfService (#889)', () => {
  test('renders an unsigned checkout as a PDF', async ({ assert }) => {
    const { buffer, filename } = await render(data())
    assert.equal(buffer.subarray(0, 4).toString(), '%PDF')
    assert.equal(filename, 'etat-des-lieux-3-checkout.pdf')
  })

  test('renders a signed checkin with its checkout counterpart', async ({ assert }) => {
    const { buffer, filename } = await render(
      data({
        kind: 'checkin',
        lockedAt: '2026-07-08T18:30:00.000Z',
        counterpart: {
          performedAt: '2026-07-01T08:00:00.000Z',
          fuelLevel: 90,
          engineHours: '1234.5',
          items: [{ itemKey: 'hull_deck.hull_condition', state: 'ok', note: null }],
        },
        signatures: [
          {
            role: 'client',
            signerName: 'Alice Martin',
            signedAt: '2026-07-08T18:30:00.000Z',
            image: PNG,
          },
          {
            role: 'staff',
            signerName: 'Marc Le Goff',
            signedAt: '2026-07-08T18:30:00.000Z',
            image: PNG,
          },
        ],
      })
    )
    assert.equal(buffer.subarray(0, 4).toString(), '%PDF')
    assert.equal(filename, 'etat-des-lieux-3-checkin.pdf')
  })

  test('a checkin without checkout, unreadable photos and many findings still renders', async ({
    assert,
  }) => {
    const { buffer } = await render(
      data({
        kind: 'checkin',
        counterpart: null,
        photos: [Buffer.from('not an image')],
        photoCount: 20,
        items: Array.from({ length: 40 }, (_, index) => ({
          itemKey: 'hull_deck.hull_condition',
          state: 'remark' as const,
          note: `Remarque ${index} `.repeat(12),
        })),
      })
    )
    assert.equal(buffer.subarray(0, 4).toString(), '%PDF')
  })
})

test.group('decodeSignature (#889)', () => {
  test('returns the PNG bytes', ({ assert }) => {
    const image = decodeSignature(`data:image/png;base64,${PNG_BASE64}`)
    assert.isTrue(image.equals(PNG))
  })

  test('rejects another format or bytes that are not a PNG', ({ assert }) => {
    assert.throws(
      () => decodeSignature(`data:image/jpeg;base64,${PNG_BASE64}`),
      BoatInspectionValidationError
    )
    assert.throws(
      () => decodeSignature('data:image/png;base64,aGVsbG8gd29ybGQ='),
      BoatInspectionValidationError
    )
    assert.throws(() => decodeSignature('data:image/png;base64,'), BoatInspectionValidationError)
  })
})
