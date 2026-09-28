<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import type { BoatReservationRow } from '~/types/reservation'
import { confirmDelete } from '~/utils/native_dialog'

/**
 * Actions d'une ligne de réservation : état des lieux, contrat, paiement
 * (#875), modification et suppression.
 */
const props = defineProps<{
  boatId: number
  row: BoatReservationRow
}>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'payment'): void
}>()

const { t } = useT()

function deleteReservation() {
  confirmDelete(
    t('reservations.form.confirmDelete'),
    `/boats/${props.boatId}/reservations/${props.row.id}`,
    { preserveScroll: true }
  )
}
</script>

<template>
  <div
    class="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
  >
    <BaseButton
      variant="ghost"
      size="sm"
      :title="t('reservations.actions.inspection')"
      :aria-label="t('reservations.actions.inspectionFor', { client: row.clientName })"
      route="boats.reservations.inspection.show"
      :params="{ boatId, reservationId: row.id }"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </BaseButton>
    <BaseButton
      variant="ghost"
      size="sm"
      :title="t('reservations.actions.contract')"
      :aria-label="t('reservations.actions.contractFor', { client: row.clientName })"
      route="boats.reservations.contract.show"
      :params="{ boatId, reservationId: row.id }"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    </BaseButton>
    <BaseButton
      variant="ghost"
      size="sm"
      :title="t('reservations.actions.payment')"
      :aria-label="t('reservations.actions.paymentFor', { client: row.clientName })"
      @click="emit('payment')"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    </BaseButton>
    <BaseButton
      variant="ghost"
      size="sm"
      :title="t('reservations.form.edit')"
      :aria-label="t('reservations.actions.editFor', { client: row.clientName })"
      @click="emit('edit')"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    </BaseButton>
    <BaseButton
      variant="danger"
      size="sm"
      :title="t('reservations.form.delete')"
      :aria-label="t('reservations.actions.deleteFor', { client: row.clientName })"
      @click="deleteReservation"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
    </BaseButton>
  </div>
</template>
