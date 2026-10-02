import {
  MarinaStayGuestRequiredError,
  MarinaStayLockedError,
  MarinaStayNotFoundError,
  MarinaStayNotInvoiceableError,
  MarinaStayOverlapError,
  MarinaStayTransitionError,
  SpotNotInPortError,
  SpotOutOfServiceError,
} from '#exceptions/marina_errors'
import Boat from '#models/boat'
import Client from '#models/client'
import MarinaStay from '#models/marina_stay'
import Organization from '#models/organization'
import type Port from '#models/port'
import type Spot from '#models/spot'
import InvoiceService from '#services/invoice_service'
import SpotService from '#services/spot_service'
import {
  MARINA_DEFAULT_TAX_RATE,
  MARINA_STAY_ACTIVE_STATUSES,
  MARINA_STAY_HISTORY_DAYS,
  MARINA_STAY_INVOICEABLE_STATUSES,
  MARINA_STAY_TRANSITIONS,
} from '#shared/constants/marina'
import { spotFitsLength, stayNights, stayTotal } from '#shared/helpers/marina'
import { toIsoDay } from '#shared/helpers/date'
import { formatDate } from '#shared/helpers/date_format'
import type {
  MarinaStayInput,
  MarinaStayRow,
  MarinaStayWarning,
  MarinaStayService as MarinaStayServiceLine,
  MarinaStayStatus,
} from '#shared/types/marina'
import { inject } from '@adonisjs/core'
import type { I18n } from '@adonisjs/i18n'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

/**
 * Escales de la capitainerie (#891) : un bateau de la flotte ou un visiteur
 * posé sur une place, de son arrivée à sa facture.
 */
@inject()
export default class MarinaStayService {
  constructor(
    private spotService: SpotService,
    private invoiceService: InvoiceService
  ) {}

  async getForPortOrFail(port: Port, stayId: number): Promise<MarinaStay> {
    const stay = await MarinaStay.query()
      .where('id', stayId)
      .where('portId', port.id)
      .where('organizationId', port.organizationId)
      .preload('spot')
      .first()
    if (!stay) throw new MarinaStayNotFoundError()
    return stay
  }

  /**
   * Pose une escale. Bloquant : place hors service, place tenue sur ces dates
   * par une autre escale active, invité absent. Non bloquant (renvoyé pour le
   * flash) : bateau plus long que la place, place déjà attribuée à un bateau
   * de la flotte (le titulaire peut être en mer).
   */
  async create(
    port: Port,
    payload: MarinaStayInput
  ): Promise<{ stay: MarinaStay; warnings: MarinaStayWarning[] }> {
    const spot = await this.#spotOrFail(port, payload.spotId)
    if (spot.status === 'out_of_service') throw new SpotOutOfServiceError()

    const boat = payload.boatId
      ? await Boat.query()
          .where('id', payload.boatId)
          .where('organizationId', port.organizationId)
          .whereNull('deletedAt')
          .select('id', 'name', 'lengthM')
          .first()
      : null
    const visitorName = payload.visitorName?.trim() || null
    if (!boat && !visitorName) throw new MarinaStayGuestRequiredError()

    // Client d'une autre organisation : ignoré, comme sur une facture.
    const client = payload.clientId
      ? await Client.query()
          .where('id', payload.clientId)
          .where('organizationId', port.organizationId)
          .select('id')
          .first()
      : null
    const clientId = client?.id ?? null

    const arrivalOn = toIsoDay(payload.arrivalOn)
    const departureOn = toIsoDay(payload.departureOn)
    await this.#assertSpotFree(spot.id, arrivalOn, departureOn)

    const guestLength = boat ? (boat.lengthM === null ? null : Number(boat.lengthM)) : null
    const length = guestLength ?? payload.visitorLengthM ?? null
    const warnings: MarinaStayWarning[] = []
    if (spotFitsLength(spot.lengthM, length) === false) warnings.push('tooLong')
    const holder = await Boat.query().where('spotId', spot.id).select('id').first()
    if (holder && holder.id !== boat?.id) warnings.push('spotHasBoat')

    const stay = await MarinaStay.create({
      organizationId: port.organizationId,
      portId: port.id,
      spotId: spot.id,
      boatId: boat?.id ?? null,
      clientId,
      visitorName: boat ? null : visitorName,
      visitorLengthM: boat ? null : (payload.visitorLengthM ?? null),
      visitorRegistration: boat ? null : payload.visitorRegistration?.trim() || null,
      visitorContact: boat ? null : payload.visitorContact?.trim() || null,
      arrivalOn: DateTime.fromISO(arrivalOn),
      departureOn: DateTime.fromISO(departureOn),
      status: 'expected',
      // Tarif nuitée : saisi, sinon le tarif journalier de la place.
      nightlyRate: payload.nightlyRate ?? spot.dailyRate ?? 0,
      services: payload.services ?? [],
      notes: payload.notes?.trim() || null,
    })

    return { stay, warnings }
  }

  async transition(stay: MarinaStay, status: MarinaStayStatus): Promise<MarinaStay> {
    if (!MARINA_STAY_TRANSITIONS[stay.status].includes(status)) {
      throw new MarinaStayTransitionError()
    }
    stay.status = status
    await stay.save()
    return stay
  }

  /**
   * Facture une escale : un brouillon pré-rempli (nuitées × tarif, puis une
   * ligne par service) que l'exploitant relit avant envoi. L'escale passe
   * `invoiced` dans la même transaction que la création — une double
   * soumission ne produit pas deux factures.
   */
  async invoice(stay: MarinaStay, i18n: I18n, actorUserId: number | null) {
    return await db.transaction(async (trx) => {
      const locked = await MarinaStay.query({ client: trx })
        .where('id', stay.id)
        .forUpdate()
        .preload('spot')
        .preload('boat', (q) => q.select('id', 'name'))
        .firstOrFail()
      if (!MARINA_STAY_INVOICEABLE_STATUSES.includes(locked.status) || locked.invoiceId) {
        throw new MarinaStayNotInvoiceableError()
      }

      const org = await Organization.findOrFail(locked.organizationId, { client: trx })
      const arrivalOn = locked.arrivalOn.toISODate()!
      const departureOn = locked.departureOn.toISODate()!
      const nights = stayNights(arrivalOn, departureOn)
      const guest = locked.boat?.name ?? locked.visitorName ?? ''

      const invoice = await this.invoiceService.create(
        org,
        {
          kind: 'invoice',
          clientId: locked.clientId,
          status: 'draft',
          issuedAt: DateTime.now(),
          taxRate: MARINA_DEFAULT_TAX_RATE,
          notes: i18n.t('ports.invoice.stayNotes', {
            guest,
            spot: locked.spot.name,
            arrival: formatDate(arrivalOn, i18n.locale),
            departure: formatDate(departureOn, i18n.locale),
          }),
          lines: [
            {
              label: i18n.t('ports.invoice.nightsLine', {
                spot: locked.spot.name,
                count: nights,
              }),
              quantity: nights,
              unitPrice: locked.nightlyRate,
            },
            ...locked.services,
          ],
        },
        actorUserId,
        trx
      )

      locked.useTransaction(trx)
      locked.status = 'invoiced'
      locked.invoiceId = invoice.id
      await locked.save()

      return invoice
    })
  }

  async delete(stay: MarinaStay): Promise<void> {
    if (stay.status === 'invoiced') throw new MarinaStayLockedError()
    await stay.delete()
  }

  /**
   * Escales listées à la capitainerie : toutes celles qui tiennent encore une
   * place, plus l'historique récent (départs des 60 derniers jours).
   */
  async listForPort(port: Port, today: string): Promise<MarinaStayRow[]> {
    const since = DateTime.fromISO(today).minus({ days: MARINA_STAY_HISTORY_DAYS }).toISODate()!
    const stays = await MarinaStay.query()
      .where('portId', port.id)
      .where('organizationId', port.organizationId)
      .where((q) =>
        q.whereIn('status', [...MARINA_STAY_ACTIVE_STATUSES]).orWhere('departureOn', '>=', since)
      )
      .preload('spot', (q) => q.select('id', 'name'))
      .preload('boat', (q) => q.select('id', 'name', 'lengthM'))
      .preload('client', (q) => q.select('id', 'firstName', 'lastName'))
      .orderBy('arrivalOn', 'desc')
      .orderBy('id', 'desc')
      .limit(200)

    return stays.map((stay) => this.toRow(stay))
  }

  toRow(stay: MarinaStay): MarinaStayRow {
    const arrivalOn = stay.arrivalOn.toISODate()!
    const departureOn = stay.departureOn.toISODate()!
    const nights = stayNights(arrivalOn, departureOn)
    const services: MarinaStayServiceLine[] = stay.services ?? []
    const boatLength = stay.boat?.lengthM ?? null

    return {
      id: stay.id,
      spotId: stay.spotId,
      spotName: stay.spot?.name ?? '',
      boatId: stay.boatId,
      guestName: stay.boat?.name ?? stay.visitorName ?? '',
      isVisitor: stay.boatId === null,
      guestLengthM: stay.boatId
        ? boatLength === null
          ? null
          : Number(boatLength)
        : stay.visitorLengthM,
      visitorRegistration: stay.visitorRegistration,
      visitorContact: stay.visitorContact,
      clientId: stay.clientId,
      clientName: stay.client?.fullName ?? null,
      arrivalOn,
      departureOn,
      nights,
      status: stay.status,
      nightlyRate: stay.nightlyRate,
      services,
      totalAmount: stayTotal(nights, stay.nightlyRate, services),
      invoiceId: stay.invoiceId,
      notes: stay.notes,
    }
  }

  async #spotOrFail(port: Port, spotId: number): Promise<Spot> {
    const spot = await this.spotService.findInPort(port.id, spotId)
    if (!spot || spot.organizationId !== port.organizationId) throw new SpotNotInPortError()
    return spot
  }

  /** Deux escales actives ne se chevauchent pas sur une même place (`[arrivée, départ)`). */
  async #assertSpotFree(spotId: number, arrivalOn: string, departureOn: string) {
    const clash = await MarinaStay.query()
      .where('spotId', spotId)
      .whereIn('status', [...MARINA_STAY_ACTIVE_STATUSES])
      .where('arrivalOn', '<', departureOn)
      .where('departureOn', '>', arrivalOn)
      .preload('boat', (q) => q.select('id', 'name'))
      .first()
    if (clash) throw new MarinaStayOverlapError(clash.boat?.name ?? clash.visitorName ?? '')
  }
}
