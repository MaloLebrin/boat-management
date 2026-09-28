<script setup lang="ts">
import { computed } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useT } from '~/composables/use_t'
import { paymentAttention } from '#shared/helpers/reservation_payment'
import type { BoatReservationRow, ReservationPaymentStatus } from '~/types/reservation'

/**
 * Où en est l'argent d'une réservation (#875). Ce qui réclame une action —
 * acompte attendu, solde à encaisser avant le départ — passe devant le statut.
 */
const props = defineProps<{
  reservation: BoatReservationRow
}>()

const { t } = useT()

const statusVariant: Record<ReservationPaymentStatus, 'neutral' | 'info' | 'success'> = {
  unpaid: 'neutral',
  deposit_paid: 'info',
  paid: 'success',
  refunded: 'neutral',
}

const badge = computed(() => {
  const r = props.reservation
  const attention = paymentAttention(r)
  if (attention === 'balance_due') {
    return { variant: 'danger' as const, label: t('reservations.payment.attention.balance_due') }
  }
  if (attention === 'deposit_due') {
    return { variant: 'warning' as const, label: t('reservations.payment.attention.deposit_due') }
  }
  // Une option ou une annulation sans argent reçu n'a rien à montrer.
  if (r.paymentStatus === 'unpaid' && r.status !== 'confirmed') return null
  return {
    variant: statusVariant[r.paymentStatus],
    label: t(`reservations.payment.status.${r.paymentStatus}`),
  }
})
</script>

<template>
  <BaseBadge v-if="badge" :variant="badge.variant">{{ badge.label }}</BaseBadge>
  <span v-else class="text-fg-subtle">—</span>
</template>
