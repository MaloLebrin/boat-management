<script setup lang="ts">
import BaseModal from '~/components/base/BaseModal.vue'
import ReservationPaymentPanel from '~/components/reservations/payment/ReservationPaymentPanel.vue'
import { useT } from '~/composables/use_t'
import type { BoatReservationRow } from '~/types/reservation'

defineProps<{
  open: boolean
  boatId: number
  /** Lue dans les props fraîches de la page : elle suit chaque encaissement. */
  reservation: BoatReservationRow | null
  canManage: boolean
  reloadProps: string[]
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const { t } = useT()
</script>

<template>
  <BaseModal
    :open="open && reservation !== null"
    :title="t('reservations.payment.title')"
    :subtitle="
      reservation
        ? t('reservations.payment.subtitle', { client: reservation.clientName })
        : undefined
    "
    :close-label="t('common.close')"
    size="xl"
    @update:open="emit('update:open', $event)"
  >
    <ReservationPaymentPanel
      v-if="reservation"
      :boat-id="boatId"
      :reservation="reservation"
      :can-manage="canManage"
      :reload-props="reloadProps"
    />
  </BaseModal>
</template>
