<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import FleetReservationList from '~/components/reservations/FleetReservationList.vue'
import ReservationTimeline from '~/components/reservations/ReservationTimeline.vue'
import { useT } from '~/composables/use_t'
import type {
  BoatReservationRow,
  FleetBoatCalendarEntry,
  FleetBoatOption,
} from '~/types/reservation'

const props = defineProps<{
  reservations: BoatReservationRow[]
  calendarEntries: FleetBoatCalendarEntry[]
  boats: FleetBoatOption[]
  selectedBoatId: number | null
}>()

const { t } = useT()

type ViewMode = 'list' | 'timeline'
const viewMode = ref<ViewMode>('timeline')

const boatOptions = computed(() => [
  { value: '', label: t('reservations.calendar.allBoats') },
  ...props.boats.map((b) => ({ value: String(b.id), label: b.name })),
])

function filterByBoat(boatId: string) {
  const query = boatId ? { boatId } : {}
  router.get('/reservations', query, { preserveScroll: true })
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <BaseHeading level="1">{{ t('reservations.fleet.title') }}</BaseHeading>
        <p class="mt-1 text-sm text-fg-muted">{{ t('reservations.fleet.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <BaseButton
          :variant="viewMode === 'timeline' ? 'primary' : 'ghost'"
          size="sm"
          @click="viewMode = 'timeline'"
        >
          {{ t('reservations.view.timeline') }}
        </BaseButton>
        <BaseButton
          :variant="viewMode === 'list' ? 'primary' : 'ghost'"
          size="sm"
          @click="viewMode = 'list'"
        >
          {{ t('reservations.view.list') }}
        </BaseButton>
      </div>
    </div>

    <!-- Boat filter -->
    <div class="max-w-xs">
      <BaseSelect
        :model-value="selectedBoatId ? String(selectedBoatId) : ''"
        :options="boatOptions"
        @update:model-value="filterByBoat"
      />
    </div>

    <ReservationTimeline v-if="viewMode === 'timeline'" :calendar-entries="calendarEntries" />
    <FleetReservationList v-else :reservations="reservations" />
  </div>
</template>
