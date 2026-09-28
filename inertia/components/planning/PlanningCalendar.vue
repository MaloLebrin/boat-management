<script setup lang="ts">
import type { PlanningReservation, PlanningTask } from '#shared/types/planning'
import { reservationCoversDay } from '#shared/helpers/planning_schedule'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import AvailabilityBand from '~/components/planning/AvailabilityBand.vue'
import PlanningCalendarGrid, {
  type PlanningCalendarCell,
} from '~/components/planning/PlanningCalendarGrid.vue'
import PlanningCalendarHourTasks from '~/components/planning/PlanningCalendarHourTasks.vue'
import { computed } from 'vue'
import { router } from '@inertiajs/vue3'
import { useDateFormat } from '~/composables/use_date_format'
import { useMonthNav } from '~/composables/use_month_nav'
import { useT } from '~/composables/use_t'
import { usePermissions } from '~/composables/use_permissions'
import { maintenanceSubjectLabel } from '~/utils/boat_enum_labels'
import { todayDateInputValue } from '~/utils/local_datetime'
import { reservationBandKind, reservationBandTitle } from '~/utils/planning_reservations'

const props = defineProps<{
  tasks: PlanningTask[]
  /** Réservations superposées en bandes (#869). */
  reservations?: PlanningReservation[]
  /** `maintenance.edit` : glisser une tâche sur un autre jour (#869). */
  canReschedule?: boolean
}>()

const emit = defineEmits<{ reschedule: [task: PlanningTask, dueAt: string | null] }>()

const { t } = useT()
const { formatWeekdayDay, formatDayMonth } = useDateFormat()
const { can } = usePermissions()
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

// Voir PlanningTaskCard : /planning est ouvert à tout utilisateur authentifié, mais
// /boats/:id exige `boats.view` — un mécanicien n'a donc rien à cliquer ici (#473).
const canViewBoat = computed(() => can('boats.view'))

function openBoat(boatId: number) {
  if (!canViewBoat.value) return
  router.visit(`/boats/${boatId}`)
}

const todayIso = todayDateInputValue()

const calendarDays = computed<PlanningCalendarCell[]>(() => {
  const month = String(currentMonth.value + 1).padStart(2, '0')
  const reservations = props.reservations ?? []
  return Array.from({ length: daysInMonth.value }, (_, i) => {
    const iso = `${currentYear.value}-${month}-${String(i + 1).padStart(2, '0')}`
    return {
      day: i + 1,
      iso,
      tasks: props.tasks.filter((task) => task.dueAt === iso),
      reservations: reservations.filter((r) => reservationCoversDay(r, iso)),
    }
  })
})

const agendaDays = computed(() => calendarDays.value.filter((d) => d.tasks.length > 0))
const tasksWithoutDate = computed(() =>
  props.tasks.filter((task) => !task.dueAt && task.kind === 'date')
)
const hourTasks = computed(() => props.tasks.filter((task) => task.kind === 'hours'))

function taskPillClass(task: PlanningTask): string {
  const dueDate = task.dueAt
  if (!dueDate) return 'bg-navy-600 text-white'
  if (dueDate < todayIso) return 'bg-coral-600 text-white'
  const soon = new Date(`${todayIso}T00:00:00`)
  soon.setDate(soon.getDate() + 30)
  if (new Date(`${dueDate}T00:00:00`) <= soon) return 'bg-amber-600 text-white'
  return 'bg-navy-600 text-white'
}

function agendaDayLabel(day: number): string {
  return formatWeekdayDay(new Date(currentYear.value, currentMonth.value, day))
}
</script>

<template>
  <div class="space-y-6">
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

      <!-- Mobile: agenda list -->
      <div class="sm:hidden">
        <div v-if="agendaDays.length === 0" class="py-8 text-center text-sm text-fg-muted">
          {{ t('planning.calendar.agendaEmpty') }}
        </div>
        <div v-else class="divide-y divide-border">
          <div v-for="cell in agendaDays" :key="cell.day" class="flex gap-3 py-3">
            <div class="w-12 shrink-0 text-center">
              <span
                class="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
                :class="cell.iso === todayIso ? 'bg-navy-500 text-white' : 'text-fg-muted'"
              >
                {{ cell.day }}
              </span>
              <p class="mt-0.5 text-xs text-fg-muted capitalize">{{ agendaDayLabel(cell.day) }}</p>
            </div>
            <div class="flex-1 space-y-1.5">
              <div
                v-for="task in cell.tasks"
                :key="task.id"
                :class="[
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium',
                  canViewBoat ? 'cursor-pointer hover:opacity-80' : '',
                  taskPillClass(task),
                ]"
                @click="openBoat(task.boatId)"
              >
                <span class="truncate">{{ task.title }}</span>
                <span class="ml-auto shrink-0 text-xs opacity-75">{{ task.boatName }}</span>
              </div>
              <AvailabilityBand
                v-for="r in cell.reservations"
                :key="`r-${r.id}`"
                :kind="reservationBandKind(r)"
                :label="r.boatName"
                :title="reservationBandTitle(t, formatDayMonth, r)"
                :href="canViewBoat ? `/boats/${r.boatId}/reservations` : undefined"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop: 7-column calendar grid -->
      <PlanningCalendarGrid
        class="hidden sm:block"
        :cells="calendarDays"
        :leading-blanks="firstWeekday"
        :weekdays="weekdays"
        :today-iso="todayIso"
        :reservations="reservations ?? []"
        :can-view-boat="canViewBoat"
        :can-reschedule="!!canReschedule"
        @open="openBoat"
        @reschedule="(task, dueAt) => emit('reschedule', task, dueAt)"
      />
    </BaseCard>

    <!-- Tasks without date -->
    <BaseCard v-if="tasksWithoutDate.length > 0">
      <template #header>
        <h2 class="text-sm font-semibold text-fg">{{ t('planning.calendar.withoutDate') }}</h2>
      </template>
      <div class="space-y-2">
        <div
          v-for="task in tasksWithoutDate"
          :key="task.id"
          class="flex items-center justify-between rounded-lg border border-border px-3 py-2"
        >
          <div>
            <p class="text-sm font-medium text-fg">{{ task.title }}</p>
            <p class="text-xs text-fg-muted">
              {{ task.boatName }} · {{ maintenanceSubjectLabel(t, task.subject) }}
            </p>
          </div>
          <BaseButton
            v-if="canViewBoat"
            variant="ghost"
            size="sm"
            route="boats.show"
            :params="{ id: task.boatId }"
          >
            {{ t('planning.calendar.schedule') }}
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <PlanningCalendarHourTasks :tasks="hourTasks" />
  </div>
</template>
