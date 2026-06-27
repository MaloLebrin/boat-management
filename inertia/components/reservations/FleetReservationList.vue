<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import ReservationStatusBadge from '~/components/reservations/ReservationStatusBadge.vue'
import { useT } from '~/composables/use_t'
import type { BoatReservationRow } from '~/types/reservation'

defineProps<{
  reservations: BoatReservationRow[]
}>()

const { t } = useT()

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
</script>

<template>
  <BaseCard>
    <BaseEmptyState
      v-if="reservations.length === 0"
      :title="t('reservations.empty.title')"
      :description="t('reservations.empty.fleetDescription')"
    />
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr
            class="border-b border-border text-left text-xs font-semibold uppercase text-fg-muted"
          >
            <th class="pb-2 pr-4">{{ t('reservations.columns.boat') }}</th>
            <th class="pb-2 pr-4">{{ t('reservations.columns.period') }}</th>
            <th class="pb-2 pr-4">{{ t('reservations.columns.client') }}</th>
            <th class="pb-2 pr-4">{{ t('reservations.columns.status') }}</th>
            <th class="pb-2">{{ t('reservations.columns.price') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="row in reservations" :key="row.id">
            <td class="py-2 pr-4 font-medium text-fg">{{ row.boatName }}</td>
            <td class="py-2 pr-4 text-fg-muted">
              {{ formatDate(row.startsAt) }} → {{ formatDate(row.endsAt) }}
            </td>
            <td class="py-2 pr-4">
              <span class="text-fg">{{ row.clientName }}</span>
            </td>
            <td class="py-2 pr-4">
              <ReservationStatusBadge :status="row.status" />
            </td>
            <td class="py-2 text-fg">
              {{ row.totalPrice ? `${row.totalPrice} €` : '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </BaseCard>
</template>
