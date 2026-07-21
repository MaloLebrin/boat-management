import Boat from '#models/boat'
import BoatReservation from '#models/boat_reservation'
import Client from '#models/client'
import Invoice from '#models/invoice'
import type Organization from '#models/organization'
import PricingSeason from '#models/pricing_season'
import RentalContract from '#models/rental_contract'
import type User from '#models/user'
import type BoatPricingService from '#services/boat_pricing_service'
import type BoatReservationService from '#services/boat_reservation_service'
import type ClientService from '#services/client_service'
import type InvoiceService from '#services/invoice_service'
import type PricingSeasonService from '#services/pricing_season_service'
import type RentalContractService from '#services/rental_contract_service'
import type { CreateClientPayload } from '#shared/types/client'
import type { CreatePricingSeasonPayload } from '#shared/types/pricing_season'
import type { CreateReservationPayload } from '#shared/types/reservation'
import type { InvoiceLineInput } from '#shared/types/invoice'

/** Returns the org's first boat (every org in this seeder already has ≥1). */
export async function firstBoat(orgId: number): Promise<Boat> {
  return Boat.query().where('organizationId', orgId).orderBy('id', 'asc').firstOrFail()
}

/** Creates a client if none exists with that email in the org (idempotent). */
export async function ensureClient(
  clientService: ClientService,
  org: Organization,
  payload: CreateClientPayload
): Promise<Client> {
  if (payload.email) {
    const existing = await Client.query()
      .where('organizationId', org.id)
      .where('email', payload.email)
      .first()
    if (existing) return existing
  }
  return clientService.create(org, payload)
}

/** Creates a pricing season if none exists with that name in the org (idempotent). */
export async function ensurePricingSeason(
  pricingSeasonService: PricingSeasonService,
  org: Organization,
  payload: CreatePricingSeasonPayload
): Promise<PricingSeason> {
  const existing = await PricingSeason.query()
    .where('organizationId', org.id)
    .where('name', payload.name)
    .first()
  if (existing) return existing
  return pricingSeasonService.create(org, payload)
}

/** Creates a reservation if none exists for that boat + client name (idempotent). */
export async function ensureReservation(
  reservationService: BoatReservationService,
  user: User,
  boat: Boat,
  payload: CreateReservationPayload
): Promise<BoatReservation> {
  const existing = await BoatReservation.query()
    .where('boatId', boat.id)
    .where('clientName', payload.clientName)
    .first()
  if (existing) return existing
  const { reservation } = await reservationService.create(user, boat, payload)
  return reservation
}

/** Creates a rental contract if none exists for that reservation (idempotent). */
export async function ensureRentalContract(
  contractService: RentalContractService,
  user: User,
  reservation: BoatReservation
): Promise<RentalContract> {
  const existing = await RentalContract.query().where('reservationId', reservation.id).first()
  if (existing) return existing
  return contractService.createForReservation(user, reservation)
}

interface SeedInvoicePayload {
  kind: 'quote' | 'invoice'
  clientId?: number | null
  reservationId?: number | null
  issuedAt: string
  taxRate: number
  lines: InvoiceLineInput[]
}

/**
 * Creates an invoice/quote if none exists with that seed tag (idempotent).
 * `InvoiceService.create` always allocates a new sequential `number`, so
 * dedup can't rely on it — the tag is stashed in `notes` instead.
 */
export async function ensureInvoice(
  invoiceService: InvoiceService,
  org: Organization,
  tag: string,
  payload: SeedInvoicePayload
): Promise<Invoice> {
  const existing = await Invoice.query().where('organizationId', org.id).where('notes', tag).first()
  if (existing) return existing
  return invoiceService.create(org, { ...payload, notes: tag })
}

export interface BusinessDataServices {
  boatPricing: BoatPricingService
  pricingSeason: PricingSeasonService
  client: ClientService
  reservation: BoatReservationService
  contract: RentalContractService
  invoice: InvoiceService
}

/**
 * Seeds a full charter + CRM dataset for an org that has both domains active:
 * pricing, a high season, 2 clients, 2 reservations (one confirmed, one
 * option), a rental contract for the confirmed one, and a quote + an invoice.
 */
export async function seedCharterAndCrmData(
  services: BusinessDataServices,
  user: User,
  org: Organization,
  boat: Boat,
  tag: string
): Promise<void> {
  await services.boatPricing.upsert(org, boat, {
    baseDailyPrice: 200,
    baseWeeklyPrice: 1200,
    depositAmount: 500,
    minDays: 2,
    maxDays: 21,
  })
  await ensurePricingSeason(services.pricingSeason, org, {
    name: 'Haute saison',
    startsOn: '2026-07-01',
    endsOn: '2026-08-31',
    multiplier: 1.3,
    priority: 1,
  })
  const marc = await ensureClient(services.client, org, {
    firstName: 'Marc',
    lastName: 'Dupuis',
    email: 'marc.dupuis@example.test',
    status: 'active',
  })
  await ensureClient(services.client, org, {
    firstName: 'Sophie',
    lastName: 'Renard',
    email: 'sophie.renard@example.test',
    status: 'inactive',
  })
  const confirmed = await ensureReservation(services.reservation, user, boat, {
    clientName: 'Marc Dupuis',
    clientEmail: 'marc.dupuis@example.test',
    startsAt: '2026-08-05',
    endsAt: '2026-08-12',
    status: 'confirmed',
  })
  await ensureReservation(services.reservation, user, boat, {
    clientName: 'Sophie Renard',
    clientEmail: 'sophie.renard@example.test',
    startsAt: '2026-09-10',
    endsAt: '2026-09-14',
    status: 'option',
  })
  await ensureRentalContract(services.contract, user, confirmed)
  await ensureInvoice(services.invoice, org, `seed:${tag}:quote-1`, {
    kind: 'quote',
    clientId: marc.id,
    issuedAt: '2026-07-15',
    taxRate: 20,
    lines: [{ label: 'Location bateau 7 nuits', quantity: 7, unitPrice: 200 }],
  })
  await ensureInvoice(services.invoice, org, `seed:${tag}:invoice-1`, {
    kind: 'invoice',
    clientId: marc.id,
    reservationId: confirmed.id,
    issuedAt: '2026-08-12',
    taxRate: 20,
    lines: [
      { label: 'Location bateau 7 nuits', quantity: 7, unitPrice: 200 },
      { label: 'Caution', quantity: 1, unitPrice: 500 },
    ],
  })
}

/**
 * Seeds a charter-only dataset (pricing + reservations, no clients/invoices)
 * for an org that has `charter` active but not `crm_invoicing`.
 */
export async function seedCharterOnlyData(
  services: BusinessDataServices,
  user: User,
  org: Organization,
  boat: Boat
): Promise<void> {
  await services.boatPricing.upsert(org, boat, {
    baseDailyPrice: 180,
    baseWeeklyPrice: 1100,
    depositAmount: 400,
    minDays: 2,
    maxDays: 14,
  })
  await ensurePricingSeason(services.pricingSeason, org, {
    name: 'Haute saison',
    startsOn: '2026-07-01',
    endsOn: '2026-08-31',
    multiplier: 1.4,
    priority: 1,
  })
  const confirmed = await ensureReservation(services.reservation, user, boat, {
    clientName: 'Client Sans Fiche',
    startsAt: '2026-08-01',
    endsAt: '2026-08-08',
    status: 'confirmed',
  })
  await ensureReservation(services.reservation, user, boat, {
    clientName: 'Client Potentiel',
    startsAt: '2026-09-01',
    endsAt: '2026-09-05',
    status: 'option',
  })
  await ensureRentalContract(services.contract, user, confirmed)
}
