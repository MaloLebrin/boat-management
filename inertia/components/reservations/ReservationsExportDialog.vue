<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import ExportDialog from '~/components/exports/ExportDialog.vue'
import { useT } from '~/composables/use_t'
import {
  RESERVATION_PAYMENT_STATUSES,
  RESERVATION_STATUSES,
} from '../../../shared/types/reservation'

/**
 * Export CSV des réservations de la flotte (#879) : réservations qui
 * chevauchent la période, filtrées par bateau, statut et paiement.
 */
const props = defineProps<{
  boats: { id: number; name: string }[]
}>()

const { t } = useT()

const boatId = ref('')
const status = ref('')
const paymentStatus = ref('')

const boatOptions = computed(() => [
  { value: '', label: t('common.exports.reservations.allBoats') },
  ...props.boats.map((b) => ({ value: String(b.id), label: b.name })),
])

const statusOptions = computed(() => [
  { value: '', label: t('common.exports.reservations.allStatuses') },
  ...RESERVATION_STATUSES.map((s) => ({ value: s, label: t(`reservations.status.${s}`) })),
])

const paymentStatusOptions = computed(() => [
  { value: '', label: t('common.exports.reservations.allPaymentStatuses') },
  ...RESERVATION_PAYMENT_STATUSES.map((s) => ({
    value: s,
    label: t(`reservations.payment.status.${s}`),
  })),
])

const params = computed(() => ({
  boatId: boatId.value,
  status: status.value,
  paymentStatus: paymentStatus.value,
}))
</script>

<template>
  <ExportDialog
    :label="t('common.exports.reservations.button')"
    :title="t('common.exports.reservations.title')"
    base-url="/reservations/export.csv"
    :params="params"
  >
    <BaseSelect
      id="reservation-export-boat"
      v-model="boatId"
      :label="t('common.exports.reservations.boatLabel')"
      :options="boatOptions"
    />
    <div class="grid gap-4 sm:grid-cols-2">
      <BaseSelect
        id="reservation-export-status"
        v-model="status"
        :label="t('common.exports.reservations.statusLabel')"
        :options="statusOptions"
      />
      <BaseSelect
        id="reservation-export-payment"
        v-model="paymentStatus"
        :label="t('common.exports.reservations.paymentStatusLabel')"
        :options="paymentStatusOptions"
      />
    </div>
  </ExportDialog>
</template>
