<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useMonthNav } from '~/composables/use_month_nav'
import { useT } from '~/composables/use_t'
import { canPickDay, isDayBusy, type PublicBookingDraft } from '#shared/helpers/public_booking'
import type { PublicBusyRange } from '#shared/types/public_booking'

/**
 * Calendrier de disponibilité de la page publique (#881). Les jours occupés
 * ne disent pas pourquoi — ni client, ni entretien : ils sont seulement
 * indisponibles. Un clic pose l'arrivée, le suivant le départ.
 */
const props = defineProps<{
  busy: PublicBusyRange[]
  bookableFrom: string
  bookableUntil: string
  draft: PublicBookingDraft | null
}>()

const emit = defineEmits<{ (e: 'pick', day: string): void }>()

const { t } = useT()
const {
  currentYear,
  currentMonth,
  prevMonth,
  nextMonth,
  monthLabel,
  daysInMonth,
  firstWeekday,
  weekdays,
} = useMonthNav()

// Le calendrier s'ouvre sur le mois de l'arrivée choisie, sinon sur le premier réservable.
const start = (props.draft?.startsOn ?? props.bookableFrom).split('-').map(Number)
currentYear.value = start[0]
currentMonth.value = start[1] - 1

const monthKey = computed(
  () => `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}`
)
const canPrev = computed(() => monthKey.value > props.bookableFrom.slice(0, 7))
const canNext = computed(() => monthKey.value < props.bookableUntil.slice(0, 7))

const bookable = computed(() => ({ from: props.bookableFrom, until: props.bookableUntil }))

const days = computed(() =>
  Array.from({ length: daysInMonth.value }, (_, i) => {
    const iso = `${monthKey.value}-${String(i + 1).padStart(2, '0')}`
    const draft = props.draft
    const isStart = draft?.startsOn === iso
    const isEnd = draft?.endsOn === iso
    const inRange = Boolean(draft?.endsOn && iso > draft.startsOn && iso < draft.endsOn)
    return {
      day: i + 1,
      iso,
      busy: isDayBusy(iso, props.busy),
      pickable: canPickDay(iso, draft, props.busy, bookable.value),
      selected: isStart || isEnd,
      inRange,
    }
  })
)

function cellClass(cell: (typeof days.value)[number]): string {
  if (cell.selected) return 'bg-brand font-semibold text-on-brand'
  if (cell.inRange) return 'bg-brand-soft text-brand'
  if (cell.busy) return 'bg-surface-muted text-fg-subtle line-through'
  if (cell.pickable) return 'text-fg hover:bg-surface-muted'
  return 'text-fg-subtle'
}
</script>

<template>
  <div data-testid="public-booking-calendar">
    <div class="flex items-center justify-between">
      <BaseButton
        variant="ghost"
        size="sm"
        type="button"
        :disabled="!canPrev"
        :aria-label="t('public.booking.calendar.previous')"
        @click="prevMonth"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </BaseButton>
      <p class="text-sm font-semibold capitalize text-fg">{{ monthLabel }}</p>
      <BaseButton
        variant="ghost"
        size="sm"
        type="button"
        :disabled="!canNext"
        :aria-label="t('public.booking.calendar.next')"
        @click="nextMonth"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </BaseButton>
    </div>

    <div class="mt-3 grid grid-cols-7 text-center">
      <div v-for="day in weekdays" :key="day" class="py-1 text-xs font-semibold text-fg-muted">
        {{ day }}
      </div>
    </div>
    <div class="grid grid-cols-7 gap-1">
      <div v-for="n in firstWeekday" :key="`empty-${n}`" />
      <button
        v-for="cell in days"
        :key="cell.iso"
        type="button"
        class="h-10 rounded-md text-sm transition disabled:cursor-not-allowed"
        :class="cellClass(cell)"
        :disabled="!cell.pickable"
        :aria-pressed="cell.selected"
        :data-day="cell.iso"
        :data-busy="cell.busy || undefined"
        @click="emit('pick', cell.iso)"
      >
        {{ cell.day }}
      </button>
    </div>

    <div class="mt-3 flex flex-wrap gap-4 text-xs text-fg-muted">
      <span class="flex items-center gap-1.5">
        <span class="h-3 w-3 rounded-sm border border-border bg-surface-elevated" />
        {{ t('public.booking.calendar.legendFree') }}
      </span>
      <span class="flex items-center gap-1.5">
        <span class="h-3 w-3 rounded-sm bg-surface-muted" />
        {{ t('public.booking.calendar.legendBusy') }}
      </span>
      <span class="flex items-center gap-1.5">
        <span class="h-3 w-3 rounded-sm bg-brand" />
        {{ t('public.booking.calendar.legendSelected') }}
      </span>
    </div>
  </div>
</template>
