import type { BoatReservationRow } from '#shared/types/reservation'

/** Champs de paiement (#875) d'une réservation sans aucun encaissement. */
export const UNPAID_RESERVATION_FIELDS: Pick<
  BoatReservationRow,
  | 'depositAmount'
  | 'depositPaidAt'
  | 'balancePaidAt'
  | 'paidAmount'
  | 'paymentStatus'
  | 'paymentMethod'
  | 'securityDepositAmount'
  | 'securityDepositStatus'
  | 'securityDepositRetainedAmount'
  | 'securityDepositNote'
> = {
  depositAmount: null,
  depositPaidAt: null,
  balancePaidAt: null,
  paidAmount: '0.00',
  paymentStatus: 'unpaid',
  paymentMethod: null,
  securityDepositAmount: null,
  securityDepositStatus: 'none',
  securityDepositRetainedAmount: null,
  securityDepositNote: null,
}
