<script setup lang="ts">
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

function isCovered(day: number): FleetBoatCalendarEntry['reservations'][number] | null {
  const year = props.monthStart.slice(0, 4)
  const month = props.monthStart.slice(5, 7)
  const iso = `${year}-${month}-${String(day).padStart(2, '0')}`

  return (
    props.entry.reservations.find((r) => {
      const start = r.startsAt.slice(0, 10)
      const end = r.endsAt.slice(0, 10)
      return start <= iso && iso <= end
    }) ?? null
  )
}

function isFirstDay(day: number): boolean {
  const year = props.monthStart.slice(0, 4)
  const month = props.monthStart.slice(5, 7)
  const iso = `${year}-${month}-${String(day).padStart(2, '0')}`
  const res = isCovered(day)
  return res !== null && res.startsAt.slice(0, 10) === iso
}
</script>

<template>
  <div class="flex items-center border-b border-border py-1">
    <div class="w-32 shrink-0 truncate pr-2 text-sm font-medium text-fg">
      {{ entry.boatName }}
    </div>
    <div class="flex">
      <div v-for="day in days" :key="day" class="relative w-8 shrink-0">
        <template v-if="isCovered(day)">
          <div
            :class="[
              'absolute inset-y-0.5 left-0 right-0',
              pillClass[isCovered(day)!.status],
              day === days[0] || isFirstDay(day) ? 'rounded-l' : '',
            ]"
            :title="isFirstDay(day) ? isCovered(day)!.clientName : ''"
          >
            <span
              v-if="isFirstDay(day)"
              class="absolute inset-0 flex items-center px-1 text-xs truncate"
            >
              {{ isCovered(day)!.clientName }}
            </span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
