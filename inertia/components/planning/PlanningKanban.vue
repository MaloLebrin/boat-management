<script setup lang="ts">
import type { PlanningReservation, PlanningTask, TaskGroup } from '#shared/types/planning'
import { PLANNING_DROP_COLUMNS, type PlanningDropColumn } from '#shared/types/planning'
import {
  columnForDueAt,
  dueAtForColumn,
  reservationConflictFor,
} from '#shared/helpers/planning_schedule'
import PlanningKanbanColumn from '~/components/planning/PlanningKanbanColumn.vue'
import PlanningTaskCard from '~/components/planning/PlanningTaskCard.vue'
import PlanningTaskGroup from '~/components/planning/PlanningTaskGroup.vue'
import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import { usePointerDrag } from '~/composables/use_pointer_drag'
import { todayDateInputValue } from '~/utils/local_datetime'

const props = defineProps<{
  overdueTasks: PlanningTask[]
  soonTasks: PlanningTask[]
  plannedTasks: PlanningTask[]
  undatedTasks: PlanningTask[]
  doneTasks: PlanningTask[]
  doneTasksTotal: number
  groups: TaskGroup[]
  groupingEnabled: boolean
  dismissedGroupIds: Set<string>
  /** Tâche ciblée par `/planning?task=<id>` (#473). */
  highlightedTaskId?: number | null
  /** Réservations superposées (#869) : marquent les cartes en conflit. */
  reservations?: PlanningReservation[]
  /** `maintenance.edit` : les cartes datées se déplacent entre colonnes (#869). */
  canReschedule?: boolean
}>()

const emit = defineEmits<{
  ungroup: [groupId: string]
  reschedule: [task: PlanningTask, dueAt: string | null]
}>()

const { t } = useT()

const visibleGroups = computed(() => props.groups.filter((g) => !props.dismissedGroupIds.has(g.id)))

// Groups only contain plannedTasks (computed server-side), so overdue/soon/undated columns are never affected.
const groupedPlannedIds = computed(() => {
  if (!props.groupingEnabled) return new Set<number>()
  return new Set(visibleGroups.value.flatMap((g) => g.tasks.map((task) => task.id)))
})

const ungroupedPlannedTasks = computed(() =>
  props.plannedTasks.filter((task) => !groupedPlannedIds.value.has(task.id))
)

const plannedGroups = computed(() => (props.groupingEnabled ? visibleGroups.value : []))

const doneTasksLabel = computed(() => {
  const displayed = props.doneTasks.length
  const total = props.doneTasksTotal
  if (total === 0) return t('planning.kanban.completed')
  return total > 20
    ? t('planning.kanban.completedWithCount', { displayed, total })
    : t('planning.kanban.completed')
})

// Glisser-déposer (#869) : déposer une carte dans « Bientôt », « Planifiées »
// ou « Non datées » lui donne l'échéance de la colonne. « En retard » et
// « Complétées » ne sont pas des cibles : on n'y range pas une tâche à la main.
function isDropColumn(zone: string): zone is PlanningDropColumn {
  return (PLANNING_DROP_COLUMNS as readonly string[]).includes(zone)
}

const { dragged, offset, hoveredZone, start } = usePointerDrag<PlanningTask>({
  onDrop(task, zone) {
    if (!isDropColumn(zone)) return
    const today = todayDateInputValue()
    if (columnForDueAt(task.dueAt, today) === zone) return
    emit('reschedule', task, dueAtForColumn(zone, today))
  },
})

function isDraggable(task: PlanningTask): boolean {
  return !!props.canReschedule && task.kind === 'date' && task.status === 'open'
}

function conflictOf(task: PlanningTask): PlanningReservation | null {
  return reservationConflictFor(task, props.reservations ?? [])
}

function cardDrag(task: PlanningTask) {
  const isDragged = dragged.value?.id === task.id
  return {
    draggable: isDraggable(task),
    dragging: isDragged,
    dragOffset: isDragged ? offset.value : null,
    conflict: conflictOf(task),
  }
}

function zoneState(zone: PlanningDropColumn) {
  return {
    dropZone: zone,
    dropArmed: dragged.value !== null,
    dropActive: hoveredZone.value === zone,
  }
}
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
    <PlanningKanbanColumn
      :title="t('planning.kanban.overdue')"
      :count="overdueTasks.length"
      :empty-label="t('planning.kanban.overdueEmpty')"
      header-class="border-coral-500 bg-danger-soft"
      title-class="text-coral-700"
      count-class="bg-coral-600 text-white"
    >
      <PlanningTaskCard
        v-for="task in overdueTasks"
        :key="task.id"
        :task="task"
        :highlighted="task.id === highlightedTaskId"
        accent-class="border-coral-400"
        badge-class="bg-coral-100 text-coral-700"
        v-bind="cardDrag(task)"
        @drag-start="start($event, task)"
      />
    </PlanningKanbanColumn>

    <PlanningKanbanColumn
      :title="t('planning.kanban.soon')"
      :count="soonTasks.length"
      :empty-label="t('planning.kanban.soonEmpty')"
      header-class="border-amber-400 bg-amber-50"
      title-class="text-amber-700"
      count-class="bg-amber-600 text-white"
      v-bind="zoneState('soon')"
    >
      <PlanningTaskCard
        v-for="task in soonTasks"
        :key="task.id"
        :task="task"
        :highlighted="task.id === highlightedTaskId"
        accent-class="border-amber-400"
        badge-class="bg-amber-100 text-amber-700"
        v-bind="cardDrag(task)"
        @drag-start="start($event, task)"
      />
    </PlanningKanbanColumn>

    <PlanningKanbanColumn
      :title="t('planning.kanban.undated')"
      :count="undatedTasks.length"
      :empty-label="t('planning.kanban.undatedEmpty')"
      header-class="border-fg-subtle bg-surface-muted"
      title-class="text-fg"
      count-class="bg-fg-subtle text-white"
      v-bind="zoneState('undated')"
    >
      <PlanningTaskCard
        v-for="task in undatedTasks"
        :key="task.id"
        :task="task"
        :highlighted="task.id === highlightedTaskId"
        accent-class="border-fg-subtle"
        badge-class="bg-surface-muted text-fg"
        v-bind="cardDrag(task)"
        @drag-start="start($event, task)"
      />
    </PlanningKanbanColumn>

    <!--
      Les quatre autres colonnes teintent leur en-tête avec une palette de
      marque, dont les paliers `-50`/`-700` s'inversent sous `[data-theme]`.
      Le navy, lui, est la palette des surfaces *permanentes* (sidebar, bandeaux)
      et n'est pas réinversée : `bg-navy-25` restait donc un aplat quasi blanc
      en thème sombre, seul en-tête clair du kanban (#457). Les tokens `brand`
      portent la même teinte et basculent, `text-on-brand` suivant sur la
      pastille.
    -->
    <PlanningKanbanColumn
      :title="t('planning.kanban.planned')"
      :count="plannedTasks.length"
      :empty-label="t('planning.kanban.plannedEmpty')"
      header-class="border-brand bg-brand-soft"
      title-class="text-brand"
      count-class="bg-brand text-on-brand"
      v-bind="zoneState('planned')"
    >
      <!-- Groupes actifs dans la colonne planifiées -->
      <template v-if="groupingEnabled">
        <PlanningTaskGroup
          v-for="group in plannedGroups"
          :key="group.id"
          :group="group"
          @ungroup="emit('ungroup', $event)"
        />
      </template>
      <PlanningTaskCard
        v-for="task in ungroupedPlannedTasks"
        :key="task.id"
        :task="task"
        :highlighted="task.id === highlightedTaskId"
        badge-class="bg-surface-muted text-fg-muted"
        v-bind="cardDrag(task)"
        @drag-start="start($event, task)"
      />
    </PlanningKanbanColumn>

    <PlanningKanbanColumn
      :title="doneTasksLabel"
      :count="doneTasks.length"
      :empty-label="t('planning.kanban.completedEmpty')"
      header-class="border-mint-600 bg-mint-50"
      title-class="text-mint-700"
      count-class="bg-mint-600 text-white"
    >
      <PlanningTaskCard
        v-for="task in doneTasks"
        :key="task.id"
        :task="task"
        :highlighted="task.id === highlightedTaskId"
        accent-class="border-mint-600 opacity-75"
        badge-class="bg-mint-100 text-mint-700"
        :done="true"
      />
    </PlanningKanbanColumn>
  </div>
</template>
