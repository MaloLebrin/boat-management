<script setup lang="ts">
import { computed, ref } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
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
  canCreateQuote: boolean
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
  <Head :title="t('reservations.fleet.title')" />

  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-fg">
          {{ t('reservations.fleet.title') }}
        </h1>
        <p class="mt-2 text-base text-fg-muted">{{ t('reservations.fleet.subtitle') }}</p>
      </div>

      <!-- Segmented view toggle -->
      <div
        class="flex shrink-0 items-center rounded-(--radius-control) bg-surface-muted p-1 ring-1 ring-border"
      >
        <BaseButton
          :variant="viewMode === 'timeline' ? 'secondary' : 'ghost'"
          size="sm"
          @click="viewMode = 'timeline'"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {{ t('reservations.view.timeline') }}
        </BaseButton>
        <BaseButton
          :variant="viewMode === 'list' ? 'secondary' : 'ghost'"
          size="sm"
          @click="viewMode = 'list'"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            />
          </svg>
          {{ t('reservations.view.list') }}
        </BaseButton>
      </div>
    </div>

    <!-- Boat filter -->
    <div class="mt-6 flex items-center gap-3">
      <svg
        class="h-4 w-4 shrink-0 text-fg-muted"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
        />
      </svg>
      <div class="w-56">
        <BaseSelect
          :model-value="selectedBoatId ? String(selectedBoatId) : ''"
          :options="boatOptions"
          @update:model-value="filterByBoat"
        />
      </div>
    </div>

    <div class="mt-6">
      <ReservationTimeline v-if="viewMode === 'timeline'" :calendar-entries="calendarEntries" />
      <FleetReservationList
        v-else
        :reservations="reservations"
        :can-create-quote="canCreateQuote"
      />
    </div>
  </div>
</template>
