<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { useMonthNav } from '~/composables/use_month_nav'
import { useT } from '~/composables/use_t'
import type { BoatReservationRow, ReservationStatus } from '~/types/reservation'

const props = defineProps<{
  reservations: BoatReservationRow[]
}>()

const { t } = useT()
const {
  currentYear,
  currentMonth,
  prevMonth,
  nextMonth,
  monthLabel,
  daysInMonth,
  firstWeekday,
  isToday,
  weekdays,
} = useMonthNav()

const reservationsByDay = computed(() => {
  const map = new Map<number, BoatReservationRow[]>()
  const year = currentYear.value
  const month = String(currentMonth.value + 1).padStart(2, '0')
  const total = daysInMonth.value

  for (const r of props.reservations) {
    const rStart = r.startsAt.slice(0, 10)
    const rEnd = r.endsAt.slice(0, 10)
    for (let d = 1; d <= total; d++) {
      const iso = `${year}-${month}-${String(d).padStart(2, '0')}`
      if (rStart <= iso && iso <= rEnd) {
        const list = map.get(d) ?? []
        list.push(r)
        map.set(d, list)
      }
    }
  }

  return map
})

const calendarDays = computed(() =>
  Array.from({ length: daysInMonth.value }, (_, i) => ({
    day: i + 1,
    reservations: reservationsByDay.value.get(i + 1) ?? [],
  }))
)

const pillClass: Record<ReservationStatus, string> = {
  option: 'bg-peach-100 text-peach-800',
  confirmed: 'bg-mint-100 text-mint-800',
  cancelled: 'bg-lilac-100 text-lilac-800 line-through',
}
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

    <div
      v-if="calendarDays.every((d) => d.reservations.length === 0)"
      class="py-6 text-center text-sm text-fg-muted"
    >
      {{ t('reservations.calendar.noReservations') }}
    </div>
    <div v-else>
      <div class="mb-1 grid grid-cols-7 text-center">
        <div v-for="day in weekdays" :key="day" class="py-1 text-xs font-semibold text-fg-muted">
          {{ day }}
        </div>
      </div>
      <div class="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border">
        <div
          v-for="n in firstWeekday"
          :key="`empty-${n}`"
          class="min-h-16 bg-surface-muted/40 p-1"
        />
        <div
          v-for="cell in calendarDays"
          :key="cell.day"
          class="min-h-16 bg-surface-elevated p-1.5"
          :class="isToday(cell.day) ? 'ring-2 ring-inset ring-navy-500' : ''"
        >
          <span
            class="mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
            :class="isToday(cell.day) ? 'bg-navy-500 text-white' : 'text-fg-muted'"
          >
            {{ cell.day }}
          </span>
          <div class="space-y-0.5">
            <div
              v-for="res in cell.reservations.slice(0, 2)"
              :key="res.id"
              :class="['truncate rounded px-1 py-0.5 text-xs font-medium', pillClass[res.status]]"
              :title="res.clientName"
            >
              {{ res.clientName }}
            </div>
            <div
              v-if="cell.reservations.length > 2"
              class="rounded bg-surface-muted px-1 py-0.5 text-xs text-fg-muted"
            >
              {{ t('reservations.calendar.more', { count: String(cell.reservations.length - 2) }) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </BaseCard>
</template>
