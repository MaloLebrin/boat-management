import vine from '@vinejs/vine'
import {
  RESERVATION_PAYMENT_KINDS,
  RESERVATION_PAYMENT_METHODS,
  SECURITY_DEPOSIT_ACTIONS,
} from '#shared/types/reservation'

/** Encaissement d'une réservation (#875) : acompte, solde ou remboursement. */
export const recordReservationPaymentValidator = vine.compile(
  vine.object({
    kind: vine.enum(RESERVATION_PAYMENT_KINDS),
    method: vine.enum(RESERVATION_PAYMENT_METHODS).optional().nullable(),
    amount: vine.number().min(0).max(99_999_999).decimal([0, 2]).optional().nullable(),
  })
)

/** Caution d'une réservation (#875) : bloquée, restituée ou retenue. */
export const settleSecurityDepositValidator = vine.compile(
  vine.object({
    action: vine.enum(SECURITY_DEPOSIT_ACTIONS),
    amount: vine.number().min(0).max(99_999_999).decimal([0, 2]).optional().nullable(),
    note: vine.string().trim().maxLength(2000).optional().nullable(),
  })
)
