import { test } from '@japa/runner'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import app from '@adonisjs/core/services/app'
import i18nManager from '@adonisjs/i18n/services/main'
import PDFDocument from 'pdfkit'
import { DateTime } from 'luxon'
import Invoice from '#models/invoice'
import InvoiceLine from '#models/invoice_line'
import Organization from '#models/organization'
import RentalContract from '#models/rental_contract'
import type BoatMaintenanceEvent from '#models/boat_maintenance_event'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { CrewMemberFactory } from '#database/factories/crew_member_factory'
import { NavigationLogFactory } from '#database/factories/navigation_log_factory'
import { BoatMaintenanceEventFactory } from '#database/factories/boat_maintenance_event_factory'
import BoatHullService from '#services/boat_hull_service'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import InvoicePdfService from '#services/invoice_pdf_service'
import RentalContractPdfService from '#services/rental_contract_pdf_service'
import MaintenanceHistoryPdfService from '#services/maintenance_history_pdf_service'
import CrewRolePdfService from '#services/crew_role_pdf_service'
import MaintenanceLogPdfService from '#services/maintenance_log_pdf_service'
import { formatDate } from '#shared/helpers/date_format'
import type { MaintenanceEventRow, MaintenanceHistoryFilters } from '#shared/types/maintenance'
import { createAdminUser, createEnterpriseAdminUser } from '#tests/functional/helpers'

/**
 * Photographie de la séquence d'appels PDFKit de chaque générateur PDF, avec
 * des entrées fixes (vague 2.3). Le flux PDF est compressé et sans extracteur
 * de texte dans les dépendances : on enregistre ce que le service demande à
 * PDFKit (textes, couleurs, rectangles, polices, positions). L'extraction du
 * kit partagé (thème, en-tête, pied) doit produire un diff nul.
 *
 * Régénérer après un changement de rendu **voulu** :
 *   UPDATE_PDF_FIXTURES=1 node ace test integration --files=services/pdf_render_snapshot
 */
const FIXTURES_DIR = new URL('./__fixtures__/pdf/', import.meta.url).pathname
const UPDATE = process.env.UPDATE_PDF_FIXTURES === '1'

const SPIED = [
  'text',
  'fillColor',
  'strokeColor',
  'fill',
  'stroke',
  'rect',
  'moveTo',
  'lineTo',
  'lineWidth',
  'fontSize',
  'font',
  'moveDown',
  'image',
  'addPage',
  'switchToPage',
] as const

type Entry = unknown[]

type Replacement = [string | RegExp, string]

function normalizeValue(value: unknown, replacements: Replacement[]): unknown {
  // JSON n'a pas d'`undefined` : un argument optionnel absent devient `null`.
  if (value === undefined) return null
  if (typeof value === 'number') return Math.round(value * 100) / 100
  if (typeof value === 'string') {
    return replacements.reduce(
      (s, [from, to]) => (typeof from === 'string' ? s.split(from).join(to) : s.replace(from, to)),
      value
    )
  }
  if (Buffer.isBuffer(value)) return '<buffer>'
  if (typeof value === 'function') return '<fn>'
  if (Array.isArray(value)) return value.map((v) => normalizeValue(v, replacements))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        normalizeValue(v, replacements),
      ])
    )
  }
  return value
}

/** Enregistre les appels PDFKit émis pendant `run`. */
async function recordCalls(run: () => Promise<unknown>): Promise<Entry[]> {
  const calls: Entry[] = []
  const originals = new Map<string, (...args: unknown[]) => unknown>()
  const proto = PDFDocument.prototype as unknown as Record<string, (...args: unknown[]) => unknown>
  for (const method of SPIED) {
    const original = proto[method]
    originals.set(method, original)
    proto[method] = function (this: unknown, ...args: unknown[]) {
      calls.push([method, ...args])
      return original.apply(this, args)
    }
  }
  try {
    await run()
  } finally {
    for (const [method, original] of originals) proto[method] = original
  }
  return calls
}

async function snapshot(
  assert: {
    deepEqual: (a: unknown, b: unknown, message?: string) => void
    equal: (a: unknown, b: unknown, message?: string) => void
  },
  name: string,
  locale: 'fr' | 'en',
  run: () => Promise<{ buffer: Buffer; filename: string }>,
  ids: Replacement[] = []
) {
  let result: { buffer: Buffer; filename: string } | undefined
  const calls = await recordCalls(async () => {
    result = await run()
  })
  const replacements: Replacement[] = [
    // Chemin absolu du logo (`app.publicPath`) : diffère entre le poste et le CI.
    [app.publicPath(), '<public>'],
    [formatDate(new Date(), locale), '<today>'],
    // Nom de fichier de l'historique : `historique-maintenance-YYYY-MM-DD.pdf`.
    [new Date().toISOString().slice(0, 10), '<today-iso>'],
    ...ids,
  ]
  const actual = {
    filename: normalizeValue(result!.filename, replacements),
    calls: calls.map((entry) => normalizeValue(entry, replacements)),
  }

  const file = join(FIXTURES_DIR, `${name}.${locale}.json`)
  if (UPDATE || !existsSync(file)) {
    mkdirSync(FIXTURES_DIR, { recursive: true })
    writeFileSync(file, JSON.stringify(actual, null, 2) + '\n')
  }
  // Assertions ciblées : un échec désigne le premier appel qui diverge, lisible
  // dans le log du CI (un `deepEqual` global n'y affiche que `{ …(2) }`).
  const expected = JSON.parse(readFileSync(file, 'utf8')) as typeof actual
  assert.equal(actual.filename, expected.filename, `${name}.${locale} — filename`)
  const length = Math.max(actual.calls.length, expected.calls.length)
  for (let i = 0; i < length; i++) {
    assert.deepEqual(
      actual.calls[i],
      expected.calls[i],
      `${name}.${locale} — call #${i}: ${JSON.stringify(actual.calls[i])} != ${JSON.stringify(expected.calls[i])}`
    )
  }
}

async function organizationOf(user: { organizationId: number | null }) {
  return Organization.findOrFail(user.organizationId!)
}

async function invoiceFixture(organizationId: number) {
  const invoice = await Invoice.create({
    organizationId,
    clientId: null,
    kind: 'invoice',
    number: 'FAC-000042',
    clientName: 'Alice Martin',
    status: 'sent',
    issuedAt: DateTime.fromISO('2026-07-05'),
    dueAt: DateTime.fromISO('2026-08-04'),
    subtotal: '1234.50',
    taxRate: '20.00',
    taxAmount: '246.90',
    total: '1481.40',
    currency: 'EUR',
    notes: 'Paiement à réception. Merci de votre confiance.',
  })
  await InvoiceLine.createMany([
    {
      invoiceId: invoice.id,
      label: 'Location Hermione — 7 jours',
      quantity: '7',
      unitPrice: '150.00',
      amount: '1050.00',
      position: 0,
    },
    {
      invoiceId: invoice.id,
      label: 'Nettoyage de fin de séjour',
      quantity: '1',
      unitPrice: '184.50',
      amount: '184.50',
      position: 1,
    },
  ])
  await invoice.load('lines')
  await invoice.load('client')
  return invoice
}

async function rentalFixture(organizationId: number) {
  const boat = await BoatFactory.merge({ organizationId, name: 'Hermione' }).create()
  const reservation = await BoatReservationFactory.merge({
    boatId: boat.id,
    organizationId,
    status: 'confirmed',
    startsAt: DateTime.fromISO('2026-07-10T09:00:00', { zone: 'utc' }),
    endsAt: DateTime.fromISO('2026-07-17T17:00:00', { zone: 'utc' }),
    clientName: 'Alice Martin',
    clientEmail: 'alice@example.com',
    clientPhone: '+33 6 12 34 56 78',
  }).create()
  const contract = await RentalContract.create({
    organizationId,
    reservationId: reservation.id,
    clientId: null,
    status: 'draft',
  })
  await contract.load('reservation', (q) => q.preload('boat'))
  return contract
}

const HISTORY_ROWS: MaintenanceEventRow[] = [
  {
    id: 1,
    boatId: 1,
    boatName: 'Hermione',
    subject: 'engine',
    title: 'Vidange moteur',
    notes: 'Huile 15W40, filtre changé',
    performedAt: '2026-06-01',
    engineCaption: 'Volvo Penta D2-55',
    sailCaption: null,
    boatEngineId: 1,
    boatSailId: null,
    boatRigId: null,
    boatSafetyEquipmentId: null,
    parts: [
      { name: 'Filtre à huile', quantity: 1, notes: null },
      { name: 'Huile 15W40 (5 L)', quantity: 2, notes: 'Référence 12345' },
    ],
    totalCost: 89.9,
  },
  {
    id: 2,
    boatId: 1,
    boatName: 'Hermione',
    subject: 'hull',
    title: 'Carénage annuel',
    notes: null,
    performedAt: '2026-04-15',
    engineCaption: null,
    sailCaption: null,
    boatEngineId: null,
    boatSailId: null,
    boatRigId: null,
    boatSafetyEquipmentId: null,
    parts: [],
    totalCost: null,
  },
]

const HISTORY_FILTERS: MaintenanceHistoryFilters = {
  q: 'moteur',
  subject: 'engine',
  boatId: 1,
  dateFrom: '2026-01-01',
  dateTo: '2026-12-31',
  sort: 'recent',
  page: 1,
  perPage: 20,
}

async function crewFixture(organizationId: number) {
  const boat = await BoatFactory.merge({ organizationId, name: 'Hermione' }).create()
  const log = await NavigationLogFactory.merge({
    boatId: boat.id,
    organizationId,
    departedAt: DateTime.fromISO('2026-07-14T08:30:00', { zone: 'utc' }),
    arrivedAt: DateTime.fromISO('2026-07-14T17:45:00', { zone: 'utc' }),
    departurePortName: 'Marseille',
    arrivalPortName: 'Cassis',
  }).create()
  const skipper = await CrewMemberFactory.merge({
    organizationId,
    firstName: 'Alice',
    lastName: 'Dupont',
    email: 'alice@example.com',
  }).create()
  const crew = await CrewMemberFactory.merge({
    organizationId,
    firstName: 'Bob',
    lastName: 'Martin',
    email: 'bob@example.com',
  }).create()
  return {
    log,
    crewWithRoles: [
      { member: skipper, role: 'skipper' as const },
      { member: crew, role: 'crew' as const },
    ],
  }
}

async function maintenanceLogFixture(user: { id: number; organizationId: number | null }) {
  const created = await BoatFactory.merge({
    organizationId: user.organizationId!,
    name: 'Hermione',
    registrationNumber: 'MA123456',
    propulsionType: 'sailboat',
    lengthM: 10.5,
    beamM: 3.4,
  }).create()
  const common = { boatId: created.id }
  const events = await BoatMaintenanceEventFactory.merge([
    {
      ...common,
      title: 'Vidange moteur',
      subject: 'engine',
      performedAt: DateTime.fromISO('2026-06-01'),
      notes: 'Huile 15W40, filtre changé',
    },
    {
      ...common,
      title: 'Carénage annuel',
      subject: 'hull',
      performedAt: DateTime.fromISO('2026-04-15'),
      notes: null,
    },
  ]).createMany(2)
  const hullService = await app.container.make(BoatHullService)
  const maintenanceService = await app.container.make(BoatMaintenanceService)
  const boat = await hullService.getFullDetailForUser(user as never, created.id)
  await boat.load('engines', (q) => q.preload('parts'))
  const listed = await maintenanceService.listForBoat(boat)
  return { boat, events: [...listed].reverse(), eventIds: events.map((e) => e.id) }
}

test.group('PDF services — render snapshot (integration)', () => {
  for (const locale of ['fr', 'en'] as const) {
    test(`invoice (${locale})`, async ({ assert }) => {
      const user = await createEnterpriseAdminUser()
      const org = await organizationOf(user)
      org.name = 'Marina Nord'
      await org.save()
      const invoice = await invoiceFixture(org.id)
      const service = await app.container.make(InvoicePdfService)

      await snapshot(assert, 'invoice', locale, () =>
        service.generate(invoice, org, i18nManager.locale(locale))
      )
    })

    test(`invoice with white-label branding (${locale})`, async ({ assert }) => {
      const user = await createEnterpriseAdminUser()
      const org = await organizationOf(user)
      org.merge({ name: 'Marina Nord', appName: 'Marina Nord Yachting', primaryColor: '#336699' })
      await org.save()
      const invoice = await invoiceFixture(org.id)
      const service = await app.container.make(InvoicePdfService)

      await snapshot(assert, 'invoice_white_label', locale, () =>
        service.generate(invoice, org, i18nManager.locale(locale))
      )
    })

    test(`rental contract (${locale})`, async ({ assert }) => {
      const user = await createAdminUser()
      const org = await organizationOf(user)
      org.name = 'Marina Nord'
      await org.save()
      const contract = await rentalFixture(org.id)
      const service = await app.container.make(RentalContractPdfService)

      await snapshot(
        assert,
        'rental_contract',
        locale,
        () => service.generate(contract, org, i18nManager.locale(locale)),
        [
          // Expression régulière : `#1` ne doit pas mordre sur la couleur `#1e3a5f`
          // quand la base de test est neuve (petits identifiants, cas du CI).
          [new RegExp(`#${contract.id}(?![0-9a-f])`, 'g'), '#<id>'],
          [new RegExp(`contrat-location-${contract.id}(?!\\d)`, 'g'), 'contrat-location-<id>'],
        ]
      )
    })

    test(`maintenance history (${locale})`, async ({ assert }) => {
      const service = await app.container.make(MaintenanceHistoryPdfService)

      await snapshot(assert, 'maintenance_history', locale, () =>
        service.generate(HISTORY_ROWS, HISTORY_FILTERS, 'Hermione', i18nManager.locale(locale))
      )
    })

    test(`crew role (${locale})`, async ({ assert }) => {
      const user = await createAdminUser()
      const { log, crewWithRoles } = await crewFixture(user.organizationId!)
      const service = await app.container.make(CrewRolePdfService)

      await snapshot(assert, 'crew_role', locale, () =>
        service.generate(log, crewWithRoles, i18nManager.locale(locale))
      )
    })

    test(`maintenance log (${locale})`, async ({ assert }) => {
      const user = await createAdminUser()
      const { boat, events } = await maintenanceLogFixture(user)
      const service = await app.container.make(MaintenanceLogPdfService)

      await snapshot(assert, 'maintenance_log', locale, () =>
        service.generate(boat, events as BoatMaintenanceEvent[], i18nManager.locale(locale))
      )
    })
  }
})
