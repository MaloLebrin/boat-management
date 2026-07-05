import type { DateTime } from 'luxon'
import type { InvoiceLink } from './invoice.js'

export const RESERVATION_STATUSES = ['option', 'confirmed', 'cancelled'] as const
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number]

export interface BoatReservationRow {
  id: number
  boatId: number
  boatName: string
  organizationId: number
  status: ReservationStatus
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
  clientName: string
  clientEmail?: string | null
  clientPhone?: string | null
  status?: ReservationStatus
  notes?: string | null
  totalPrice?: number | null
}

export interface UpdateReservationPayload {
  startsAt?: Date | string | DateTime
  endsAt?: Date | string | DateTime
  clientName?: string
  clientEmail?: string | null
  clientPhone?: string | null
  status?: ReservationStatus
  notes?: string | null
  totalPrice?: number | null
}
