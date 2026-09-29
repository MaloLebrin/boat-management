import {
  PublicBookingDatesError,
  PublicBookingNotFoundError,
} from '#exceptions/public_booking_errors'
import {
  ReservationConflictError,
  ReservationDurationError,
  ReservationExternalConflictError,
} from '#exceptions/reservation_errors'
import { BoatUnavailableError } from '#exceptions/boat_errors'
import PublicBookingService from '#services/public_booking_service'
import { PUBLIC_BOOKING_HONEYPOT_FIELD } from '#shared/constants/public_booking'
import { publicBookingRequestValidator } from '#validators/public_booking'
import { toAppLocale } from '#shared/helpers/locale_path'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'

/**
 * Page publique de réservation (#881) : sans session, le slug de
 * l'organisation et celui du bateau font office d'adresse. Une organisation
 * inconnue, sans le module réservations, ou un bateau dont la page est fermée
 * rendent la même 404.
 */
@inject()
export default class PublicBookingsController {
  constructor(private bookingService: PublicBookingService) {}

  /** `GET /book/:orgSlug` — la flotte ouverte à la réservation. */
  async fleet(ctx: HttpContext) {
    const { params, inertia, response } = ctx
    try {
      const org = await this.bookingService.findOrganization(String(params.orgSlug))
      this.noindex(response)
      return inertia.render('book/fleet', {
        organization: this.bookingService.toOrganization(org),
        boats: await this.bookingService.listBoats(org),
      })
    } catch (error) {
      if (error instanceof PublicBookingNotFoundError) return this.notFound(ctx)
      throw error
    }
  }

  /**
   * `GET /book/:orgSlug/:boatSlug` — fiche, calendrier et formulaire. Les
   * dates choisies arrivent en query string (`?startsOn=…&endsOn=…`) : la page
   * les renvoie par une visite partielle et reçoit le devis en prop `quote`.
   */
  async show(ctx: HttpContext) {
    const { params, request, inertia, response, session } = ctx
    try {
      const org = await this.bookingService.findOrganization(String(params.orgSlug))
      const boat = await this.bookingService.findBoat(org, String(params.boatSlug))
      const busy = await this.bookingService.busyRanges(boat)
      const selection = this.bookingService.parseSelection(
        request.input('startsOn'),
        request.input('endsOn')
      )
      const window = this.bookingService.bookableWindow()
      this.noindex(response)
      return inertia.render('book/show', {
        organization: this.bookingService.toOrganization(org),
        boat: await this.bookingService.boatDetail(boat),
        busy,
        bookableFrom: window.from,
        bookableUntil: window.until,
        quote: selection ? await this.bookingService.quote(boat, selection, busy) : null,
        submitted: session.flashMessages.get('publicBookingSubmitted') === true,
      })
    } catch (error) {
      if (error instanceof PublicBookingNotFoundError) return this.notFound(ctx)
      throw error
    }
  }

  /** `POST /book/:orgSlug/:boatSlug/request` — la demande devient une option. */
  async request(ctx: HttpContext) {
    const { params, request, response, session, i18n } = ctx
    let boat
    try {
      const org = await this.bookingService.findOrganization(String(params.orgSlug))
      boat = await this.bookingService.findBoat(org, String(params.boatSlug))
    } catch (error) {
      if (error instanceof PublicBookingNotFoundError) return this.notFound(ctx)
      throw error
    }

    const payload = await request.validateUsing(publicBookingRequestValidator)

    // Champ piège rempli : un robot. On lui répond comme à un humain, sans
    // rien enregistrer ni envoyer.
    if (payload[PUBLIC_BOOKING_HONEYPOT_FIELD]) {
      logger.info({ boatId: boat.id }, 'public booking request dropped by honeypot')
      session.flash('publicBookingSubmitted', true)
      return response.redirect().back()
    }

    try {
      await this.bookingService.submitRequest(boat, {
        startsOn: payload.startsOn,
        endsOn: payload.endsOn,
        name: payload.name,
        email: payload.email,
        phone: payload.phone ?? null,
        message: payload.message ?? null,
        locale: toAppLocale(payload.locale ?? i18n.locale, 'fr'),
      })
    } catch (error) {
      const key = this.errorKey(error)
      if (!key) throw error
      session.flash('error', i18n.t(key))
      return response.redirect().back()
    }

    session.flash('publicBookingSubmitted', true)
    return response.redirect().back()
  }

  private errorKey(error: unknown): string | null {
    if (error instanceof PublicBookingDatesError) {
      return error.reason === 'unavailable'
        ? 'flash.publicBooking.unavailable'
        : 'flash.publicBooking.invalidDates'
    }
    if (
      error instanceof ReservationConflictError ||
      error instanceof ReservationExternalConflictError ||
      error instanceof BoatUnavailableError
    ) {
      return 'flash.publicBooking.unavailable'
    }
    if (error instanceof ReservationDurationError) {
      return error.reason === 'below_min'
        ? 'flash.publicBooking.tooShort'
        : 'flash.publicBooking.tooLong'
    }
    return null
  }

  /** Page d'un loueur : `noindex` — elle n'a pas vocation à remonter dans un moteur. */
  private noindex(response: HttpContext['response']) {
    response.header('X-Robots-Tag', 'noindex')
  }

  private notFound({ inertia, response }: HttpContext) {
    response.status(404)
    return inertia.render('errors/not_found', {})
  }
}
