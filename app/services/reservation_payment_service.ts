import { ReservationNotFoundError, ReservationPaymentError } from '#exceptions/reservation_errors'
import type BoatReservation from '#models/boat_reservation'
import type User from '#models/user'
import AuditLogService from '#services/audit_log_service'
import {
  defaultDepositAmount,
  fromCents,
  paymentStatusFor,
  toCents,
} from '#shared/helpers/reservation_payment'
import type {
  RecordReservationPaymentPayload,
  SettleSecurityDepositPayload,
} from '#shared/types/reservation'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

/**
 * Suivi manuel de l'argent d'une location (#875) : acompte, solde,
 * remboursement et caution. Le paiement en ligne est une issue séparée (#876).
 */
@inject()
export default class ReservationPaymentService {
  constructor(private auditLogService: AuditLogService) {}

  /**
   * Défauts posés à la confirmation, et tenus à jour tant que rien n'est
   * encaissé :
   *
   * - l'acompte attendu suit le prix (30 %) tant qu'il n'est pas reçu ;
   * - la caution est copiée du tarif du bateau tant qu'elle n'est pas bloquée ;
   * - un prix corrigé après un encaissement recalcule le statut (un dossier
   *   soldé redevient « acompte reçu » si le prix augmente).
   *
   * Ne sauvegarde pas : appelé avant le `save()` de la réservation.
   */
  applyDefaults(reservation: BoatReservation, pricingSecurityDeposit: string | null): void {
    const paymentStatus = reservation.paymentStatus ?? 'unpaid'
    if (reservation.status === 'confirmed') {
      if (paymentStatus === 'unpaid') {
        reservation.depositAmount = defaultDepositAmount(reservation.totalPrice)
      }
      if ((reservation.securityDepositStatus ?? 'none') === 'none') {
        const amount = toCents(pricingSecurityDeposit)
        reservation.securityDepositAmount = amount && amount > 0 ? fromCents(amount) : null
      }
    }
    if (paymentStatus === 'deposit_paid' || paymentStatus === 'paid') {
      reservation.paymentStatus = paymentStatusFor(reservation.totalPrice, reservation.paidAmount)
    }
  }

  async recordPayment(
    user: User,
    reservation: BoatReservation,
    payload: RecordReservationPaymentPayload
  ): Promise<BoatReservation> {
    this.assertScope(user, reservation)
    const now = DateTime.now()
    const method = payload.method ?? null
    let recorded: number

    if (payload.kind === 'refund') {
      const paid = toCents(reservation.paidAmount) ?? 0
      if (paid <= 0 || reservation.paymentStatus === 'refunded') {
        throw new ReservationPaymentError('nothingToRefund')
      }
      recorded = paid
      reservation.paymentStatus = 'refunded'
    } else {
      if (reservation.status === 'cancelled') throw new ReservationPaymentError('cancelled')
      if (reservation.paymentStatus === 'paid' || reservation.paymentStatus === 'refunded') {
        throw new ReservationPaymentError('alreadyPaid')
      }
      const alreadyPaid = toCents(reservation.paidAmount) ?? 0

      if (payload.kind === 'deposit') {
        if (reservation.paymentStatus !== 'unpaid') {
          throw new ReservationPaymentError('depositAlreadyPaid')
        }
        const amount =
          toCents(payload.amount ?? null) ??
          toCents(reservation.depositAmount) ??
          toCents(defaultDepositAmount(reservation.totalPrice))
        if (amount === null || amount <= 0) throw new ReservationPaymentError('amountRequired')
        const total = toCents(reservation.totalPrice)
        if (total !== null && amount > total) throw new ReservationPaymentError('amountAboveTotal')
        recorded = amount
        reservation.depositAmount = fromCents(amount)
        reservation.depositPaidAt = now
      } else {
        const total = toCents(reservation.totalPrice)
        if (total === null || total <= 0) throw new ReservationPaymentError('noPrice')
        recorded = total - alreadyPaid
        reservation.balancePaidAt = now
      }

      reservation.paidAmount = fromCents(alreadyPaid + recorded)
      reservation.paymentStatus = paymentStatusFor(reservation.totalPrice, reservation.paidAmount)
      if (reservation.paymentStatus === 'paid' && reservation.balancePaidAt === null) {
        reservation.balancePaidAt = now
      }
    }

    if (method !== null) reservation.paymentMethod = method
    await reservation.save()

    await this.auditLogService.log({
      organizationId: reservation.organizationId,
      userId: user.id,
      action: 'reservation.payment_recorded',
      entityType: 'reservation',
      entityId: reservation.id,
      metadata: {
        kind: payload.kind,
        amount: fromCents(recorded),
        method,
        paymentStatus: reservation.paymentStatus,
      },
    })

    return reservation
  }

  async settleSecurityDeposit(
    user: User,
    reservation: BoatReservation,
    payload: SettleSecurityDepositPayload
  ): Promise<BoatReservation> {
    this.assertScope(user, reservation)
    const current = reservation.securityDepositStatus ?? 'none'

    if (payload.action === 'hold') {
      if (current !== 'none') throw new ReservationPaymentError('depositNotNone')
      if (reservation.status === 'cancelled') throw new ReservationPaymentError('cancelled')
      const amount = toCents(payload.amount ?? null) ?? toCents(reservation.securityDepositAmount)
      if (amount === null || amount <= 0) throw new ReservationPaymentError('amountRequired')
      reservation.securityDepositAmount = fromCents(amount)
      reservation.securityDepositStatus = 'held'
    } else {
      if (current !== 'held') throw new ReservationPaymentError('depositNotHeld')
      if (payload.action === 'release') {
        reservation.securityDepositStatus = 'released'
        reservation.securityDepositRetainedAmount = null
        reservation.securityDepositNote = payload.note?.trim() || null
      } else {
        const retained = toCents(payload.amount ?? null)
        const held = toCents(reservation.securityDepositAmount) ?? 0
        if (retained === null || retained <= 0) throw new ReservationPaymentError('amountRequired')
        if (retained > held) throw new ReservationPaymentError('retainedAboveDeposit')
        const note = payload.note?.trim()
        if (!note) throw new ReservationPaymentError('noteRequired')
        reservation.securityDepositStatus = 'retained'
        reservation.securityDepositRetainedAmount = fromCents(retained)
        reservation.securityDepositNote = note
      }
    }

    await reservation.save()

    const action = (
      {
        hold: 'reservation.security_deposit_held',
        release: 'reservation.security_deposit_released',
        retain: 'reservation.security_deposit_retained',
      } as const
    )[payload.action]
    await this.auditLogService.log({
      organizationId: reservation.organizationId,
      userId: user.id,
      action,
      entityType: 'reservation',
      entityId: reservation.id,
      metadata: {
        amount: reservation.securityDepositAmount,
        retainedAmount: reservation.securityDepositRetainedAmount,
        note: reservation.securityDepositNote,
      },
    })

    return reservation
  }

  private assertScope(user: User, reservation: BoatReservation) {
    if (user.organizationId === null || user.organizationId !== reservation.organizationId) {
      throw new ReservationNotFoundError()
    }
  }
}
