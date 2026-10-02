<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type { OwnerTripRow } from '#shared/types/owner_portal'

/** Sorties du journal de bord (#890) : dates, ports, distance, heures moteur. */
defineProps<{ trips: OwnerTripRow[] }>()

const { t } = useT()
const { formatDate } = useDateFormat()
const { formatNumber } = useNumberFormat()
</script>

<template>
  <BaseEmptyState v-if="trips.length === 0" :title="t('owner.boats.show.trips.emptyTitle')" />

  <div v-else class="flex flex-col gap-3">
    <BaseCard v-for="trip in trips" :key="trip.id">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-fg">{{ formatDate(trip.departedAt) }}</p>
          <p class="text-xs text-fg-muted">
            {{ [trip.departurePortName, trip.arrivalPortName].filter(Boolean).join(' → ') }}
          </p>
        </div>
        <div class="shrink-0 text-right text-xs text-fg-muted">
          <p v-if="trip.distanceNm !== null">
            {{ t('owner.boats.show.trips.distance', { value: formatNumber(trip.distanceNm) }) }}
          </p>
          <p v-if="trip.engineHours !== null">
            {{ t('owner.boats.show.trips.engineHours', { value: formatNumber(trip.engineHours) }) }}
          </p>
        </div>
      </div>
    </BaseCard>
  </div>
</template>
