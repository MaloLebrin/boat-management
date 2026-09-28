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

/**
 * Suivi de l'argent d'une location (#875). `unpaid` → `deposit_paid` (acompte
 * reçu) → `paid` (solde reçu) ; `refunded` quand l'encaissé a été rendu.
 */
export const RESERVATION_PAYMENT_STATUSES = ['unpaid', 'deposit_paid', 'paid', 'refunded'] as const
export type ReservationPaymentStatus = (typeof RESERVATION_PAYMENT_STATUSES)[number]

/** Moyens d'encaissement saisis à la main (#875) — pas de paiement en ligne ici. */
export const RESERVATION_PAYMENT_METHODS = ['transfer', 'card', 'cash', 'check'] as const
export type ReservationPaymentMethod = (typeof RESERVATION_PAYMENT_METHODS)[number]

/**
 * Caution (#875) : `none` tant qu'elle n'est pas bloquée, `held` pendant la
 * location, puis `released` (restituée) ou `retained` (retenue, en tout ou
 * partie, après l'état des lieux de retour).
 */
export const SECURITY_DEPOSIT_STATUSES = ['none', 'held', 'released', 'retained'] as const
export type SecurityDepositStatus = (typeof SECURITY_DEPOSIT_STATUSES)[number]

/** Encaissement enregistré sur une réservation (#875). */
export const RESERVATION_PAYMENT_KINDS = ['deposit', 'balance', 'refund'] as const
export type ReservationPaymentKind = (typeof RESERVATION_PAYMENT_KINDS)[number]

/** Geste sur la caution (#875). */
export const SECURITY_DEPOSIT_ACTIONS = ['hold', 'release', 'retain'] as const
export type SecurityDepositAction = (typeof SECURITY_DEPOSIT_ACTIONS)[number]

export interface RecordReservationPaymentPayload {
  kind: ReservationPaymentKind
  method?: ReservationPaymentMethod | null
  /** Acompte seulement : montant reçu, à défaut l'acompte attendu. */
  amount?: number | null
}

export interface SettleSecurityDepositPayload {
  action: SecurityDepositAction
  /** `hold` : montant bloqué (défaut : celui du tarif) ; `retain` : montant retenu. */
  amount?: number | null
  /** `retain` : motif, obligatoire. */
  note?: string | null
}

/** Ce qui réclame une action côté paiement (#875) : badge et notifications. */
export type ReservationPaymentAttention = 'deposit_due' | 'balance_due' | null

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
  /** Paiement (#875) — montants en chaînes décimales, comme `totalPrice`. */
  depositAmount: string | null
  depositPaidAt: string | null
  balancePaidAt: string | null
  paidAmount: string
  paymentStatus: ReservationPaymentStatus
  paymentMethod: ReservationPaymentMethod | null
  securityDepositAmount: string | null
  securityDepositStatus: SecurityDepositStatus
  securityDepositRetainedAmount: string | null
  securityDepositNote: string | null
  createdAt: string
  // Quotes/invoices generated from this reservation (empty when none).
  linkedInvoices: InvoiceLink[]
}

export interface FleetBoatCalendarEntry {
  boatId: number
  boatName: string
  reservations: BoatReservationRow[]
  /**
   * Entretiens planifiés du bateau (#869), superposés à la frise. Vide quand
   * l'appelant n'a pas `maintenance.view`.
   */
  maintenance: FleetMaintenanceWindow[]
}

/** Tâche de maintenance ouverte et datée, vue comme une plage de jours (#869). */
export interface FleetMaintenanceWindow {
  taskId: number
  title: string
  /** `YYYY-MM-DD`, inclusif. */
  startsOn: string
  /** `YYYY-MM-DD`, exclusif. */
  endsOn: string
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
  /**
   * Motif de forçage (#870) : pose la réservation confirmée malgré une
   * indisponibilité du bateau. Le contrôleur ne le transmet que si l'utilisateur
   * a `boats.reservations.force` ; il est tracé au journal d'audit.
   */
  forceReason?: string | null
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
  /**
   * Motif de forçage (#870) : pose la réservation confirmée malgré une
   * indisponibilité du bateau. Le contrôleur ne le transmet que si l'utilisateur
   * a `boats.reservations.force` ; il est tracé au journal d'audit.
   */
  forceReason?: string | null
}
