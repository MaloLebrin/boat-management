<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import ReservationCreateButton from '~/components/reservations/ReservationCreateButton.vue'
import ReservationTimelineRow from '~/components/reservations/ReservationTimelineRow.vue'
import { useMonthNav } from '~/composables/use_month_nav'
import { useT } from '~/composables/use_t'
import type { FleetBoatCalendarEntry, FleetBoatOption } from '~/types/reservation'

const props = defineProps<{
  calendarEntries: FleetBoatCalendarEntry[]
  boats: FleetBoatOption[]
  selectedBoatId: number | null
}>()

const { t } = useT()
const { currentYear, currentMonth, prevMonth, nextMonth, monthLabel, daysInMonth, isToday } =
  useMonthNav()

const days = computed(() => Array.from({ length: daysInMonth.value }, (_, i) => i + 1))

const scrollEl = ref<HTMLElement | null>(null)
const isScrollable = ref(false)

function checkScrollable() {
  const el = scrollEl.value
  isScrollable.value = !!el && el.scrollWidth > el.clientWidth + 1
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  checkScrollable()
  resizeObserver = new ResizeObserver(checkScrollable)
  if (scrollEl.value) resizeObserver.observe(scrollEl.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

watch(days, () => nextTick(checkScrollable))

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
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <BaseButton variant="ghost" size="sm" @click="prevMonth">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </BaseButton>
          <h2 class="min-w-32 text-center text-sm font-semibold capitalize text-fg">
            {{ monthLabel }}
          </h2>
          <BaseButton variant="ghost" size="sm" @click="nextMonth">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </BaseButton>
        </div>

        <!-- Legend -->
        <div class="flex items-center gap-4 text-xs text-fg-muted">
          <span class="flex items-center gap-1.5">
            <span class="h-2.5 w-5 rounded-sm bg-peach-300" />
            {{ t('reservations.status.option') }}
          </span>
          <span class="flex items-center gap-1.5">
            <span class="h-2.5 w-5 rounded-sm bg-mint-300" />
            {{ t('reservations.status.confirmed') }}
          </span>
          <span class="flex items-center gap-1.5">
            <span class="h-2.5 w-5 rounded-sm bg-lilac-200 opacity-60" />
            {{ t('reservations.status.cancelled') }}
          </span>
        </div>
      </div>
    </template>

    <BaseEmptyState
      v-if="calendarEntries.length === 0"
      :title="t('reservations.empty.title')"
      :description="t('reservations.empty.fleetDescription')"
    >
      <template #action>
        <ReservationCreateButton :boats="boats" :selected-boat-id="selectedBoatId" />
      </template>
    </BaseEmptyState>

    <template v-else>
      <p
        v-if="isScrollable"
        class="mb-2 flex items-center gap-1.5 text-xs text-fg-muted"
        aria-hidden="true"
      >
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 5l7 7-7 7M5 12h15"
          />
        </svg>
        {{ t('reservations.calendar.scrollHint') }}
      </p>

      <div ref="scrollEl" class="overflow-x-auto">
        <div class="min-w-max">
          <!-- Day headers -->
          <div class="flex border-b border-border pb-2">
            <div class="w-36 shrink-0" />
            <div
              v-for="day in days"
              :key="day"
              class="w-8 shrink-0 text-center text-xs text-fg-muted"
              :class="isToday(day) ? 'font-bold text-navy-600' : ''"
            >
              {{ day }}
              <span
                v-if="isToday(day)"
                class="mx-auto mt-0.5 block h-1 w-1 rounded-full bg-navy-500"
              />
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
        </div>
      </div>
    </template>
  </BaseCard>
</template>
