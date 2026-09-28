<script setup lang="ts">
import type { PlanningReservation, PlanningTask } from '#shared/types/planning'
import { reservationConflictFor } from '#shared/helpers/planning_schedule'
import AvailabilityBand from '~/components/planning/AvailabilityBand.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { usePointerDrag } from '~/composables/use_pointer_drag'
import { useT } from '~/composables/use_t'
import { reservationBandKind, reservationBandTitle } from '~/utils/planning_reservations'

export interface PlanningCalendarCell {
  day: number
  /** `YYYY-MM-DD` du jour. */
  iso: string
  tasks: PlanningTask[]
  reservations: PlanningReservation[]
}

const props = defineProps<{
  cells: PlanningCalendarCell[]
  /** Cases vides avant le 1er du mois (semaine du lundi). */
  leadingBlanks: number
  weekdays: string[]
  todayIso: string
  reservations: PlanningReservation[]
  canViewBoat: boolean
  /** `maintenance.edit` : une tâche datée se glisse sur un autre jour (#869). */
  canReschedule: boolean
}>()

const emit = defineEmits<{
  open: [boatId: number]
  reschedule: [task: PlanningTask, dueAt: string]
}>()

const { t } = useT()
const { formatDayMonth } = useDateFormat()

const { dragged, offset, hoveredZone, start } = usePointerDrag<PlanningTask>({
  onDrop(task, zone) {
    if (!zone.startsWith('day:')) return
    const iso = zone.slice(4)
    if (iso !== task.dueAt) emit('reschedule', task, iso)
  },
})

function isDraggable(task: PlanningTask): boolean {
  return props.canReschedule && task.kind === 'date' && task.status === 'open'
}

function onPointerDown(event: PointerEvent, task: PlanningTask) {
  if (isDraggable(task)) start(event, task)
}

function pillClass(task: PlanningTask): string {
  if (task.status === 'done') return 'bg-mint-600 text-white'
  if (!task.dueAt) return 'bg-navy-600 text-white'
  if (task.dueAt < props.todayIso) return 'bg-coral-600 text-white'
  const soon = new Date(`${props.todayIso}T00:00:00`)
  soon.setDate(soon.getDate() + 30)
  if (new Date(`${task.dueAt}T00:00:00`) <= soon) return 'bg-amber-600 text-white'
  return 'bg-navy-600 text-white'
}

function pillTitle(task: PlanningTask): string {
  const base = `${task.boatName} · ${task.title}`
  const conflict = reservationConflictFor(task, props.reservations)
  return conflict ? `${base} — ${bandTitle(conflict)}` : base
}

function bandTitle(r: PlanningReservation): string {
  return reservationBandTitle(t, formatDayMonth, r)
}

function dragStyle(task: PlanningTask) {
  if (dragged.value?.id !== task.id) return undefined
  return {
    transform: `translate(${offset.value.x}px, ${offset.value.y}px)`,
    pointerEvents: 'none' as const,
  }
}
</script>

<template>
  <div>
    <div class="mb-1 grid grid-cols-7 text-center">
      <div v-for="day in weekdays" :key="day" class="py-1 text-xs font-semibold text-fg-muted">
        {{ day }}
      </div>
    </div>
    <div class="grid grid-cols-7 gap-px rounded-lg border border-border">
      <div
        v-for="n in leadingBlanks"
        :key="`empty-${n}`"
        class="min-h-20 bg-surface-muted/40 p-1"
      />
      <div
        v-for="cell in cells"
        :key="cell.day"
        class="min-h-20 bg-surface-elevated p-1.5"
        :class="[
          cell.iso === todayIso ? 'ring-2 ring-inset ring-navy-500' : '',
          dragged && hoveredZone === `day:${cell.iso}`
            ? 'bg-brand-soft ring-2 ring-inset ring-brand'
            : '',
        ]"
        :data-drop-zone="`day:${cell.iso}`"
        :data-testid="`planning-day-${cell.iso}`"
      >
        <span
          class="mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
          :class="cell.iso === todayIso ? 'bg-navy-500 text-white' : 'text-fg-muted'"
        >
          {{ cell.day }}
        </span>
        <div class="space-y-0.5">
          <div
            v-for="task in cell.tasks.slice(0, 3)"
            :key="task.id"
            :class="[
              'relative truncate rounded px-1 py-0.5 text-xs font-medium',
              canViewBoat ? 'cursor-pointer hover:opacity-80' : '',
              isDraggable(task) ? 'touch-none cursor-grab' : '',
              dragged?.id === task.id ? 'z-50 shadow-lg' : '',
              reservationConflictFor(task, reservations) ? 'ring-2 ring-danger' : '',
              pillClass(task),
            ]"
            :style="dragStyle(task)"
            :title="pillTitle(task)"
            :data-testid="`planning-calendar-task-${task.id}`"
            @pointerdown="onPointerDown($event, task)"
            @click="canViewBoat && emit('open', task.boatId)"
          >
            {{ task.title }}
          </div>
          <div
            v-if="cell.tasks.length > 3"
            class="rounded bg-surface-muted px-1 py-0.5 text-xs text-fg-muted"
          >
            {{ t('planning.calendar.more', { count: String(cell.tasks.length - 3) }) }}
          </div>
          <!-- Réservations (#869) : sous les tâches, non déplaçables. -->
          <AvailabilityBand
            v-for="r in cell.reservations.slice(0, 2)"
            :key="`r-${r.id}`"
            :kind="reservationBandKind(r)"
            :label="r.boatName"
            :title="bandTitle(r)"
            :href="canViewBoat ? `/boats/${r.boatId}/reservations` : undefined"
          />
          <div v-if="cell.reservations.length > 2" class="px-1 text-[11px] text-fg-muted">
            {{ t('planning.reservations.more', { count: String(cell.reservations.length - 2) }) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
