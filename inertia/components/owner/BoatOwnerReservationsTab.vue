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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}
</script>

<template>
  <BaseEmptyState
    v-if="reservations.length === 0"
    :title="t('owner.boats.show.reservations.emptyTitle')"
  />

  <div v-else class="flex flex-col gap-3">
    <BaseCard v-for="reservation in reservations" :key="reservation.id">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-fg">
            {{ formatDate(reservation.startsAt) }} — {{ formatDate(reservation.endsAt) }}
          </p>
          <p class="text-xs text-fg-muted">{{ reservation.clientName }}</p>
        </div>
        <ReservationStatusBadge :status="reservation.status" />
      </div>
    </BaseCard>
  </div>
</template>
