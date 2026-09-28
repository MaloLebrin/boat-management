import type {
  ReservationPaymentAttention,
  ReservationPaymentStatus,
  ReservationStatus,
} from '#shared/types/reservation'

/**
 * Calculs du suivi de paiement d'une réservation (#875). Les montants voyagent
 * en chaînes décimales (colonnes `DECIMAL`) ; les calculs se font en centimes
 * pour ne pas cumuler d'erreurs d'arrondi.
 */

/** Acompte attendu par défaut, en pourcentage du prix de la location. */
export const DEFAULT_DEPOSIT_PERCENT = 30

/** Le solde est réclamé à partir de J-7 avant le départ. */
export const BALANCE_DUE_DAYS_BEFORE_DEPARTURE = 7

const DAY_MS = 86_400_000

export function toCents(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

/** 30 % du prix, arrondi au centime ; `null` sans prix (rien à demander). */
export function defaultDepositAmount(
  totalPrice: string | number | null,
  percent: number = DEFAULT_DEPOSIT_PERCENT
): string | null {
  const total = toCents(totalPrice)
  if (total === null || total <= 0) return null
  return fromCents(Math.round((total * percent) / 100))
}

/** Reste à encaisser (jamais négatif) ; `null` sans prix. */
export function balanceDue(
  totalPrice: string | number | null,
  paidAmount: string | number | null
): string | null {
  const total = toCents(totalPrice)
  if (total === null) return null
  return fromCents(Math.max(0, total - (toCents(paidAmount) ?? 0)))
}

/**
 * Statut qui découle de l'encaissé : tout le prix reçu → `paid`, une partie
 * → `deposit_paid`, rien → `unpaid`. Sans prix, un encaissement vaut solde.
 */
export function paymentStatusFor(
  totalPrice: string | number | null,
  paidAmount: string | number | null
): ReservationPaymentStatus {
  const paid = toCents(paidAmount) ?? 0
  if (paid <= 0) return 'unpaid'
  const total = toCents(totalPrice)
  if (total === null || paid >= total) return 'paid'
  return 'deposit_paid'
}

export interface PaymentAttentionInput {
  status: ReservationStatus
  paymentStatus: ReservationPaymentStatus
  depositAmount: string | null
  totalPrice: string | null
  paidAmount: string | null
  startsAt: string
}

/**
 * Ce que le loueur doit réclamer, la veille d'un départ comme au quotidien :
 *
 * - `balance_due` : départ dans moins de 7 jours (ou passé) et solde restant ;
 * - `deposit_due` : réservation confirmée dont l'acompte n'est pas arrivé ;
 * - `null` sinon — une option, une annulation, un dossier soldé ou remboursé
 *   ne réclament rien.
 */
export function paymentAttention(
  reservation: PaymentAttentionInput,
  now: Date = new Date()
): ReservationPaymentAttention {
  if (reservation.status !== 'confirmed') return null
  if (reservation.paymentStatus === 'paid' || reservation.paymentStatus === 'refunded') return null

  const remaining = toCents(balanceDue(reservation.totalPrice, reservation.paidAmount)) ?? 0
  const startsAt = Date.parse(reservation.startsAt)
  const departureSoon =
    !Number.isNaN(startsAt) &&
    startsAt - now.getTime() <= BALANCE_DUE_DAYS_BEFORE_DEPARTURE * DAY_MS
  if (departureSoon && remaining > 0) return 'balance_due'

  const deposit = toCents(reservation.depositAmount) ?? 0
  if (reservation.paymentStatus === 'unpaid' && deposit > 0) return 'deposit_due'
  return null
}
