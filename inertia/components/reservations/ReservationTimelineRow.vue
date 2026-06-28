<script setup lang="ts">
import { computed } from 'vue'
import type { FleetBoatCalendarEntry, ReservationStatus } from '~/types/reservation'

const props = defineProps<{
  entry: FleetBoatCalendarEntry
  days: number[]
  monthStart: string
  monthEnd: string
}>()

const pillClass: Record<ReservationStatus, string> = {
  option: 'bg-peach-200 text-peach-900',
  confirmed: 'bg-mint-200 text-mint-900',
  cancelled: 'bg-lilac-100 text-lilac-700 opacity-60',
}

const year = computed(() => props.monthStart.slice(0, 4))
const month = computed(() => props.monthStart.slice(5, 7))

function isoForDay(day: number): string {
  return `${year.value}-${month.value}-${String(day).padStart(2, '0')}`
}

const coveredByDay = computed(() => {
  return new Map(
    props.days.map((day) => {
      const iso = isoForDay(day)
      const res =
        props.entry.reservations.find((r) => {
          return r.startsAt.slice(0, 10) <= iso && iso < r.endsAt.slice(0, 10)
        }) ?? null
      return [day, res] as const
    })
  )
})
</script>

<template>
  <div class="flex items-center border-b border-border py-1">
    <div class="w-32 shrink-0 truncate pr-2 text-sm font-medium text-fg">
      {{ entry.boatName }}
    </div>
    <div class="flex">
      <div v-for="day in days" :key="day" class="relative w-8 shrink-0">
        <template v-if="coveredByDay.get(day)">
          <div
            :class="[
              'absolute inset-y-0.5 left-0 right-0',
              pillClass[coveredByDay.get(day)!.status],
              day === days[0] || coveredByDay.get(day)?.startsAt.slice(0, 10) === isoForDay(day)
                ? 'rounded-l'
                : '',
              day === days[days.length - 1] ||
              coveredByDay.get(day)?.endsAt.slice(0, 10) === isoForDay(day + 1)
                ? 'rounded-r'
                : '',
            ]"
            :title="
              coveredByDay.get(day)?.startsAt.slice(0, 10) === isoForDay(day)
                ? coveredByDay.get(day)?.clientName
                : ''
            "
          >
            <span
              v-if="coveredByDay.get(day)?.startsAt.slice(0, 10) === isoForDay(day)"
              class="absolute inset-0 flex items-center truncate px-1 text-xs"
            >
              {{ coveredByDay.get(day)?.clientName }}
            </span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
