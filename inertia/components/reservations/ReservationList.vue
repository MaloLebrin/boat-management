<script setup lang="ts">
import { ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import ReservationEditModal from '~/components/reservations/ReservationEditModal.vue'
import ReservationStatusBadge from '~/components/reservations/ReservationStatusBadge.vue'
import { useReservationFormat } from '~/composables/use_reservation_format'
import { useT } from '~/composables/use_t'
import type { BoatPricingRow } from '#shared/types/boat_pricing'
import type { PricingSeasonRow } from '#shared/types/pricing_season'
import type { BoatReservationRow } from '~/types/reservation'

const props = defineProps<{
  boatId: number
  reservations: BoatReservationRow[]
  canManage: boolean
  boatPricing: BoatPricingRow | null
  pricingSeasons: PricingSeasonRow[]
}>()

const { t } = useT()
const { formatDate } = useReservationFormat()

const editingReservation = ref<BoatReservationRow | null>(null)
const editModalOpen = ref(false)

function openEdit(row: BoatReservationRow) {
  editingReservation.value = row
  editModalOpen.value = true
}

function deleteReservation(id: number) {
  if (!window.confirm(t('reservations.form.confirmDelete'))) return
  router.delete(`/boats/${props.boatId}/reservations/${id}`, { preserveScroll: true })
}
</script>

<template>
  <BaseCard>
    <BaseEmptyState
      v-if="reservations.length === 0"
      :title="t('reservations.empty.title')"
      :description="t('reservations.empty.description')"
    />
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr
            class="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-fg-muted"
          >
            <th class="px-4 pb-3 first:pl-0">{{ t('reservations.columns.period') }}</th>
            <th class="px-4 pb-3">{{ t('reservations.columns.client') }}</th>
            <th class="px-4 pb-3">{{ t('reservations.columns.status') }}</th>
            <th class="px-4 pb-3 text-right">{{ t('reservations.columns.price') }}</th>
            <th v-if="canManage" class="px-4 pb-3 last:pr-0" />
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr
            v-for="row in reservations"
            :key="row.id"
            class="group transition-colors hover:bg-surface-muted/50"
          >
            <td class="px-4 py-3 first:pl-0">
              <span class="inline-flex items-center gap-1.5 text-fg-muted">
                <svg
                  class="h-3.5 w-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {{ formatDate(row.startsAt) }}
                <span class="text-fg-subtle">→</span>
                {{ formatDate(row.endsAt) }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span class="font-semibold text-fg">{{ row.clientName }}</span>
              <span v-if="row.clientEmail" class="block text-xs text-fg-muted">{{
                row.clientEmail
              }}</span>
            </td>
            <td class="px-4 py-3">
              <ReservationStatusBadge :status="row.status" />
            </td>
            <td class="px-4 py-3 text-right font-medium text-fg">
              {{ row.totalPrice ? `${row.totalPrice} €` : '—' }}
            </td>
            <td v-if="canManage" class="px-4 py-3 last:pr-0">
              <div
                class="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <BaseButton
                  variant="ghost"
                  size="sm"
                  :title="t('reservations.form.edit')"
                  @click="openEdit(row)"
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
                  @click="deleteReservation(row.id)"
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
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </BaseCard>

  <ReservationEditModal
    v-model:open="editModalOpen"
    :boat-id="boatId"
    :reservation="editingReservation"
    :boat-pricing="boatPricing"
    :pricing-seasons="pricingSeasons"
  />
</template>
