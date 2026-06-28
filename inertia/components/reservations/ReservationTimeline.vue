<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import ReservationTimelineRow from '~/components/reservations/ReservationTimelineRow.vue'
import { useMonthNav } from '~/composables/use_month_nav'
import { useT } from '~/composables/use_t'
import type { FleetBoatCalendarEntry } from '~/types/reservation'

const props = defineProps<{
  calendarEntries: FleetBoatCalendarEntry[]
}>()

const { t } = useT()
const { currentYear, currentMonth, prevMonth, nextMonth, monthLabel, daysInMonth, isToday } =
  useMonthNav()

const days = computed(() => Array.from({ length: daysInMonth.value }, (_, i) => i + 1))

const monthStart = computed(
  () => `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-01`
)
const monthEnd = computed(
  () =>
    `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(daysInMonth.value).padStart(2, '0')}`
)
</script>

<template>
  <BaseCard>
    <template #header>
      <div class="flex items-center justify-between">
        <BaseButton variant="ghost" size="sm" @click="prevMonth">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </BaseButton>
        <h2 class="text-sm font-semibold capitalize text-fg">{{ monthLabel }}</h2>
        <BaseButton variant="ghost" size="sm" @click="nextMonth">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </BaseButton>
      </div>
    </template>

    <div class="overflow-x-auto">
      <div class="min-w-max">
        <!-- Day headers -->
        <div class="flex border-b border-border pb-1">
          <div class="w-32 shrink-0" />
          <div
            v-for="day in days"
            :key="day"
            class="w-8 shrink-0 text-center text-xs text-fg-muted"
            :class="{ 'font-bold text-navy-600': isToday(day) }"
          >
            {{ day }}
          </div>
        </div>

        <!-- Boat rows -->
        <ReservationTimelineRow
          v-for="entry in calendarEntries"
          :key="entry.boatId"
          :entry="entry"
          :days="days"
          :month-start="monthStart"
          :month-end="monthEnd"
        />

        <div v-if="calendarEntries.length === 0" class="py-8 text-center text-sm text-fg-muted">
          {{ t('reservations.empty.fleetDescription') }}
        </div>
      </div>
    </div>
  </BaseCard>
</template>
