import type { DateTime } from 'luxon'
import type { InvoiceLink } from './invoice.js'

export const RESERVATION_STATUSES = ['option', 'confirmed', 'cancelled'] as const
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number]

/**
 * Type de prestation (#585). Une location coque nue, une sortie skippée et une
 * croisière à la cabine n'ont ni le même prix, ni les mêmes obligations
 * (skipper à bord, permis du client) — le statut seul ne les distinguait pas.
 *
 * Nullable en base : les réservations antérieures n'en portent aucun.
 */
export const RESERVATION_TYPES = ['bareboat', 'skippered', 'day_charter', 'cabin', 'other'] as const
export type ReservationType = (typeof RESERVATION_TYPES)[number]

export interface BoatReservationRow {
  id: number
  boatId: number
  boatName: string
  organizationId: number
  clientId: number | null
  status: ReservationStatus
  type: ReservationType | null
  startsAt: string
  endsAt: string
  clientName: string
  clientEmail: string | null
  clientPhone: string | null
  notes: string | null
  totalPrice: string | null
  createdAt: string
  // Quotes/invoices generated from this reservation (empty when none).
  linkedInvoices: InvoiceLink[]
}

export interface FleetBoatCalendarEntry {
  boatId: number
  boatName: string
  reservations: BoatReservationRow[]
}

export interface FleetBoatOption {
  id: number
  name: string
}

export interface CreateReservationPayload {
  startsAt: Date | string | DateTime
  endsAt: Date | string | DateTime
  /** getTimezoneOffset() of the submitting browser — used to shift the naive local datetime to UTC */
  tzOffsetMinutes?: number
  clientId?: number | null
  clientName: string
  clientEmail?: string | null
  clientPhone?: string | null
  status?: ReservationStatus
  type?: ReservationType | null
  notes?: string | null
  totalPrice?: number | null
}

export interface UpdateReservationPayload {
  startsAt?: Date | string | DateTime
  endsAt?: Date | string | DateTime
  /** getTimezoneOffset() of the submitting browser — used to shift the naive local datetime to UTC */
  tzOffsetMinutes?: number
  clientId?: number | null
  clientName?: string
  clientEmail?: string | null
  clientPhone?: string | null
  status?: ReservationStatus
  type?: ReservationType | null
  notes?: string | null
  totalPrice?: number | null
}
