<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import ReservationCreateButton from '~/components/reservations/ReservationCreateButton.vue'
import ReservationStatusBadge from '~/components/reservations/ReservationStatusBadge.vue'
import { useReservationFormat } from '~/composables/use_reservation_format'
import { useT } from '~/composables/use_t'
import type { BoatReservationRow, FleetBoatOption } from '~/types/reservation'

defineProps<{
  reservations: BoatReservationRow[]
  boats: FleetBoatOption[]
  selectedBoatId: number | null
  canCreateQuote?: boolean
}>()

const { t } = useT()
const { formatDate } = useReservationFormat()

function createQuote(reservationId: number) {
  router.post(`/invoices/from-reservation/${reservationId}`, {}, { preserveScroll: true })
}
</script>

<template>
  <BaseCard>
    <BaseEmptyState
      v-if="reservations.length === 0"
      :title="t('reservations.empty.title')"
      :description="t('reservations.empty.fleetDescription')"
    >
      <template #action>
        <ReservationCreateButton :boats="boats" :selected-boat-id="selectedBoatId" />
      </template>
    </BaseEmptyState>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr
            class="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-fg-muted"
          >
            <th class="px-4 pb-3 first:pl-0">{{ t('reservations.columns.boat') }}</th>
            <th class="px-4 pb-3">{{ t('reservations.columns.period') }}</th>
            <th class="px-4 pb-3">{{ t('reservations.columns.client') }}</th>
            <th class="px-4 pb-3">{{ t('reservations.columns.status') }}</th>
            <th class="px-4 pb-3 text-right">{{ t('reservations.columns.price') }}</th>
            <th class="px-4 pb-3 text-right last:pr-0">
              {{ t('reservations.columns.documents') }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr
            v-for="row in reservations"
            :key="row.id"
            class="group transition-colors hover:bg-surface-muted/50"
          >
            <td class="px-4 py-3 first:pl-0 font-semibold text-fg">{{ row.boatName }}</td>
            <td class="px-4 py-3">
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
            <td class="px-4 py-3 text-fg">{{ row.clientName }}</td>
            <td class="px-4 py-3">
              <ReservationStatusBadge :status="row.status" />
            </td>
            <td class="px-4 py-3 text-right font-medium text-fg">
              {{ row.totalPrice ? `${row.totalPrice} €` : '—' }}
            </td>
            <td class="px-4 py-3 last:pr-0 text-right">
              <div class="flex flex-wrap items-center justify-end gap-2">
                <Link
                  v-for="doc in row.linkedInvoices"
                  :key="doc.id"
                  :href="`/invoices/${doc.id}`"
                  class="text-sm font-medium text-primary underline"
                >
                  {{ doc.number }}
                </Link>
                <BaseButton
                  v-if="canCreateQuote"
                  variant="secondary"
                  size="sm"
                  @click="createQuote(row.id)"
                >
                  {{ t('reservations.actions.createQuote') }}
                </BaseButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </BaseCard>
</template>
