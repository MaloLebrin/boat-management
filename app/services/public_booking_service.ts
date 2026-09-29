import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import Boat from '#models/boat'
import BoatReservation from '#models/boat_reservation'
import ExternalCalendarEvent from '#models/external_calendar_event'
import Media from '#models/media'
import Organization from '#models/organization'
import PublicBookingRequested from '#events/public_booking_requested'
import {
  PublicBookingDatesError,
  PublicBookingNotFoundError,
} from '#exceptions/public_booking_errors'
import BoatAvailabilityService from '#services/boat_availability_service'
import BoatPricingService from '#services/boat_pricing_service'
import BoatReservationService from '#services/boat_reservation_service'
import { occupiedDays } from '#services/external_calendar_service'
import QuotaService from '#services/quota_service'
import ReservationQuoteService from '#services/reservation_quote_service'
import { toBoatPricingRow } from '#transformers/boat_pricing_transformer'
import { slugifyCatalogName } from '#shared/helpers/boat_catalog'
import { isDayString, mergeBusyRanges, selectionOverlapsBusy } from '#shared/helpers/public_booking'
import {
  PUBLIC_BOOKING_HORIZON_MONTHS,
  PUBLIC_BOOKING_LEAD_DAYS,
  PUBLIC_BOOKING_REQUEST_RETENTION_DAYS,
  PUBLIC_BOOKING_TIMEZONE,
} from '#shared/constants/public_booking'
import { PLAN_LIMITS } from '#shared/types/plan'
import type {
  BoatPublicBookingSettings,
  PublicBookingBoat,
  PublicBookingBoatCard,
  PublicBookingOrganization,
  PublicBookingPricing,
  PublicBookingQuote,
  PublicBookingRequestPayload,
  PublicBookingSelection,
  PublicBusyRange,
} from '#shared/types/public_booking'
import env from '#start/env'

/** Nombre de photos montrées sur la page d'un bateau. */
const MAX_PHOTOS = 8

/** Colonnes lues pour la page : la fiche publique et ce que demande la disponibilité. */
const PUBLIC_BOAT_COLUMNS = [
  'id',
  'organizationId',
  'name',
  'type',
  'lengthM',
  'maxPersons',
  'homePort',
  'manufacturer',
  'model',
  'yearBuilt',
  'status',
  'statusReason',
  'statusChangedAt',
  'publicBookingEnabled',
  'publicBookingSlug',
] as const

/**
 * Page publique de réservation (#881) : ce qu'un client final du loueur voit
 * sans compte — la flotte ouverte, la fiche d'un bateau, ses jours occupés, un
 * devis — et la demande qu'il envoie, enregistrée comme une `option`.
 *
 * Rien de ce qui sort d'ici ne porte de donnée personnelle : les créneaux
 * occupés n'ont que des dates, quelle que soit leur origine.
 */
@inject()
export default class PublicBookingService {
  constructor(
    private quotaService: QuotaService,
    private pricingService: BoatPricingService,
    private quoteService: ReservationQuoteService,
    private availabilityService: BoatAvailabilityService,
    private reservationService: BoatReservationService
  ) {}

  /**
   * Organisation par son slug, si elle a le module réservations. Sans lui, la
   * page n'existe pas plus qu'une organisation inconnue : 404 dans les deux cas.
   */
  async findOrganization(slug: string): Promise<Organization> {
    const org = await Organization.findBy('slug', slug)
    if (!org || !(await this.quotaService.canManageReservations(org))) {
      throw new PublicBookingNotFoundError()
    }
    return org
  }

  async findBoat(org: Organization, boatSlug: string): Promise<Boat> {
    const boat = await Boat.query()
      .where('organizationId', org.id)
      .where('publicBookingEnabled', true)
      .where('publicBookingSlug', boatSlug)
      .whereNot('status', 'sold')
      .select([...PUBLIC_BOAT_COLUMNS])
      .first()
    if (!boat) throw new PublicBookingNotFoundError()
    return boat
  }

  toOrganization(org: Organization): PublicBookingOrganization {
    return {
      slug: org.slug,
      name: org.appName && PLAN_LIMITS[org.plan].canWhiteLabel ? org.appName : org.name,
      logoUrl: PLAN_LIMITS[org.plan].canWhiteLabel ? org.logoUrl : null,
    }
  }

  async listBoats(org: Organization): Promise<PublicBookingBoatCard[]> {
    const boats = await Boat.query()
      .where('organizationId', org.id)
      .where('publicBookingEnabled', true)
      .whereNotNull('publicBookingSlug')
      .whereNot('status', 'sold')
      .orderBy('name', 'asc')
      .select([...PUBLIC_BOAT_COLUMNS])

    const covers = await this.photosFor(boats.map((boat) => boat.id))
    return Promise.all(
      boats.map(async (boat) => this.toCard(boat, covers.get(boat.id)?.[0] ?? null))
    )
  }

  async boatDetail(boat: Boat): Promise<PublicBookingBoat> {
    const photosByBoat = await this.photosFor([boat.id])
    const photos = photosByBoat.get(boat.id) ?? []
    return {
      ...(await this.toCard(boat, photos[0] ?? null)),
      manufacturer: boat.manufacturer,
      model: boat.model,
      yearBuilt: boat.yearBuilt,
      photos,
    }
  }

  /** Premier et dernier jour réservables, à l'heure de Paris. */
  bookableWindow(now: DateTime = DateTime.now()): { from: string; until: string } {
    const today = now.setZone(PUBLIC_BOOKING_TIMEZONE).startOf('day')
    return {
      from: today.plus({ days: PUBLIC_BOOKING_LEAD_DAYS }).toISODate()!,
      until: today.plus({ months: PUBLIC_BOOKING_HORIZON_MONTHS }).toISODate()!,
    }
  }

  /**
   * Jours occupés du bateau sur la fenêtre réservable : réservations (options
   * comprises — une demande en attente tient le créneau), créneaux importés
   * d'autres plateformes et indisponibilités (statut, entretien planifié,
   * incident immobilisant).
   */
  async busyRanges(boat: Boat, now: DateTime = DateTime.now()): Promise<PublicBusyRange[]> {
    const { from, until } = this.bookableWindow(now)
    const fromAt = DateTime.fromISO(from, { zone: PUBLIC_BOOKING_TIMEZONE })
    const untilAt = DateTime.fromISO(until, { zone: PUBLIC_BOOKING_TIMEZONE })

    const [reservations, external, windows] = await Promise.all([
      BoatReservation.query()
        .where('boatId', boat.id)
        .whereIn('status', ['option', 'confirmed'])
        .where('endsAt', '>', fromAt.toISO()!)
        .where('startsAt', '<', untilAt.toISO()!)
        .select(['startsAt', 'endsAt']),
      ExternalCalendarEvent.query()
        .where('boatId', boat.id)
        .where('endsAt', '>', fromAt.toISO()!)
        .where('startsAt', '<', untilAt.toISO()!)
        .select(['startsAt', 'endsAt']),
      this.availabilityService.windowsForBoat(boat, { from: fromAt }),
    ])

    const ranges: PublicBusyRange[] = [
      ...reservations.map((r) => occupiedDays(r.startsAt, r.endsAt)),
      ...external.map((e) => occupiedDays(e.startsAt, e.endsAt)),
      ...windows.map((w) =>
        occupiedDays(
          w.startsAt ? DateTime.fromISO(w.startsAt) : fromAt,
          w.endsAt ? DateTime.fromISO(w.endsAt) : untilAt
        )
      ),
    ]

    return mergeBusyRanges(
      ranges
        .map((range) => ({
          startsOn: range.startsOn < from ? from : range.startsOn,
          endsOn: range.endsOn > until ? until : range.endsOn,
        }))
        .filter((range) => range.startsOn < range.endsOn)
    )
  }

  /**
   * Sélection lue dans l'URL de la page (`?startsOn=…&endsOn=…`) — `null` si
   * elle est absente ou mal formée : la page s'affiche alors sans devis.
   */
  parseSelection(startsOn: unknown, endsOn: unknown): PublicBookingSelection | null {
    if (!isDayString(startsOn) || !isDayString(endsOn)) return null
    return { startsOn, endsOn }
  }

  /** Devis instantané de la sélection, avec l'état de ses dates. */
  async quote(
    boat: Boat,
    selection: PublicBookingSelection,
    busy: PublicBusyRange[],
    now: DateTime = DateTime.now()
  ): Promise<PublicBookingQuote> {
    const state = this.checkSelection(selection, busy, now)
    if (state !== 'ok') return { selection, state, quote: null }

    const { startsAt, endsAt } = this.toInstants(selection)
    const quote = await this.quoteService.quoteForBoat(boat, startsAt.toISO()!, endsAt.toISO()!)
    return { selection, state, quote }
  }

  /**
   * Demande du client : une `option` `source: 'public'`. Lève
   * `PublicBookingDatesError` sur des dates hors fenêtre ou occupées, et
   * laisse passer les erreurs de réservation (durée hors bornes, conflit
   * apparu entre l'affichage et l'envoi).
   */
  async submitRequest(
    boat: Boat,
    payload: PublicBookingRequestPayload,
    now: DateTime = DateTime.now()
  ): Promise<BoatReservation> {
    const selection = this.parseSelection(payload.startsOn, payload.endsOn)
    if (!selection) throw new PublicBookingDatesError('invalid')

    const busy = await this.busyRanges(boat, now)
    const state = this.checkSelection(selection, busy, now)
    if (state !== 'ok') throw new PublicBookingDatesError(state)

    const { startsAt, endsAt } = this.toInstants(selection)
    const reservation = await this.reservationService.createPublicRequest(boat, {
      startsAt,
      endsAt,
      clientName: payload.name,
      clientEmail: payload.email,
      clientPhone: payload.phone ?? null,
      notes: payload.message ?? null,
      locale: payload.locale,
    })

    await PublicBookingRequested.dispatch(reservation.id)
    return reservation
  }

  /** Réglage affiché sur l'onglet Réservations du bateau. */
  settingsFor(org: Organization, boat: Boat, canManage: boolean): BoatPublicBookingSettings {
    const base = `${env.get('APP_URL')}/book/${org.slug}`
    return {
      enabled: boat.publicBookingEnabled,
      url: boat.publicBookingSlug ? `${base}/${boat.publicBookingSlug}` : null,
      fleetUrl: base,
      canManage,
    }
  }

  /**
   * Ouvre ou ferme la page du bateau. Le slug est dérivé du nom à la première
   * ouverture puis gardé — y compris après une fermeture : rouvrir la page
   * rend le même lien.
   */
  async setEnabled(boat: Boat, enabled: boolean): Promise<void> {
    if (enabled && !boat.publicBookingSlug) {
      boat.publicBookingSlug = await this.uniqueSlug(boat)
    }
    boat.publicBookingEnabled = enabled
    await boat.save()
  }

  /**
   * Supprime les demandes en ligne jamais abouties au-delà de la rétention :
   * encore en `option`, ou annulées sans encaissement, contrat, facture ni
   * état des lieux. Une location réellement passée par la page — confirmée,
   * payée ou documentée — reste dans l'historique.
   */
  async purgeExpiredRequests(
    retentionDays = PUBLIC_BOOKING_REQUEST_RETENTION_DAYS
  ): Promise<number> {
    const cutoff = DateTime.now().minus({ days: retentionDays })
    const deleted = await BoatReservation.query()
      .where('source', 'public')
      .whereIn('status', ['option', 'cancelled'])
      .where('paymentStatus', 'unpaid')
      .where('createdAt', '<', cutoff.toISO()!)
      .whereNotExists((q) =>
        q
          .from('rental_contracts')
          .whereColumn('rental_contracts.reservation_id', 'boat_reservations.id')
      )
      .whereNotExists((q) =>
        q.from('invoices').whereColumn('invoices.reservation_id', 'boat_reservations.id')
      )
      .whereNotExists((q) =>
        q
          .from('boat_inspections')
          .whereColumn('boat_inspections.reservation_id', 'boat_reservations.id')
      )
      .delete()
    return Number(deleted[0] ?? 0)
  }

  private checkSelection(
    selection: PublicBookingSelection,
    busy: PublicBusyRange[],
    now: DateTime
  ): PublicBookingQuote['state'] {
    const { from, until } = this.bookableWindow(now)
    if (
      selection.endsOn <= selection.startsOn ||
      selection.startsOn < from ||
      selection.endsOn > until
    ) {
      return 'invalid'
    }
    return selectionOverlapsBusy(selection, busy) ? 'unavailable' : 'ok'
  }

  /** Arrivée et départ à minuit, heure de Paris. */
  private toInstants(selection: PublicBookingSelection) {
    return {
      startsAt: DateTime.fromISO(selection.startsOn, { zone: PUBLIC_BOOKING_TIMEZONE }),
      endsAt: DateTime.fromISO(selection.endsOn, { zone: PUBLIC_BOOKING_TIMEZONE }),
    }
  }

  private async toCard(boat: Boat, photoUrl: string | null): Promise<PublicBookingBoatCard> {
    return {
      slug: boat.publicBookingSlug!,
      name: boat.name,
      type: boat.type,
      lengthM: boat.lengthM,
      maxPersons: boat.maxPersons,
      homePort: boat.homePort,
      photoUrl,
      pricing: await this.pricingFor(boat),
    }
  }

  private async pricingFor(boat: Boat): Promise<PublicBookingPricing | null> {
    const model = await this.pricingService.getForBoat(boat)
    if (!model) return null
    const row = toBoatPricingRow(model)
    return {
      currency: row.currency,
      dailyPrice: row.baseDailyPrice,
      weeklyPrice: row.baseWeeklyPrice,
      depositAmount: row.depositAmount,
      minDays: row.minDays,
      maxDays: row.maxDays,
    }
  }

  private async photosFor(boatIds: number[]): Promise<Map<number, string[]>> {
    const byBoat = new Map<number, string[]>()
    if (boatIds.length === 0) return byBoat
    const photos = await Media.query()
      .where('entityType', 'boat')
      .whereIn('entityId', boatIds)
      .where('kind', 'photo')
      .orderBy('position', 'asc')
      .select(['entityId', 'secureUrl'])
    for (const photo of photos) {
      const list = byBoat.get(photo.entityId) ?? []
      if (list.length < MAX_PHOTOS) list.push(photo.secureUrl)
      byBoat.set(photo.entityId, list)
    }
    return byBoat
  }

  private async uniqueSlug(boat: Boat): Promise<string> {
    const base = slugifyCatalogName(boat.name).slice(0, 60) || 'boat'
    const rows: { public_booking_slug: string }[] = await db
      .from('boats')
      .where('organization_id', boat.organizationId)
      .whereNot('id', boat.id)
      .where('public_booking_slug', 'like', `${base}%`)
      .select('public_booking_slug')
    const taken = new Set(rows.map((row) => row.public_booking_slug))
    if (!taken.has(base)) return base
    for (let n = 2; ; n++) {
      const candidate = `${base}-${n}`
      if (!taken.has(candidate)) return candidate
    }
  }
}
