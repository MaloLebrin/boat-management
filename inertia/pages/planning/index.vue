<script setup lang="ts">
import type { PlanningReservation, PlanningTask, TaskGroup } from '#shared/types/planning'
import { PLANNING_DONE_TASKS_LIMIT } from '#shared/types/planning'
import type { MaintenanceAssigneeOption } from '#shared/types/maintenance'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import PlanningCalendar from '~/components/planning/PlanningCalendar.vue'
import PlanningKanban from '~/components/planning/PlanningKanban.vue'
import PlanningToolbar from '~/components/planning/PlanningToolbar.vue'
import { computed, ref, toRef } from 'vue'
import { Head, router, usePage } from '@inertiajs/vue3'
import { useT } from '~/composables/use_t'
import { usePermissions } from '~/composables/use_permissions'
import { useCurrentUser } from '~/composables/use_current_user'
import { useDateFormat } from '~/composables/use_date_format'
import { usePlanningReschedule } from '~/composables/use_planning_reschedule'
import { todayDateInputValue } from '~/utils/local_datetime'
import { applyDueAtOverrides } from '~/utils/planning_columns'
import {
  doneTotalForAssigneeFilter,
  matchesAssigneeFilter,
  type TaskAssigneeFilter,
} from '~/utils/task_assignee_filter'

const props = defineProps<{
  tasks: PlanningTask[]
  overdueTasks: PlanningTask[]
  soonTasks: PlanningTask[]
  plannedTasks: PlanningTask[]
  undatedTasks: PlanningTask[]
  doneTasks: PlanningTask[]
  doneTasksTotal: number
  doneTasksTotalByAssignee: Record<string, number>
  groups: TaskGroup[]
  canGroupTasks: boolean
  /** Réservations superposées (#869) — vide sans module Location. */
  reservations: PlanningReservation[]
  maintenanceAssignees: MaintenanceAssigneeOption[]
}>()

const { t } = useT()
const page = usePage()
const { can, isMechanic } = usePermissions()
const { formatDate } = useDateFormat()
const { currentUserId } = useCurrentUser()

// Filtre « Assigné à » (#868). Un mécanicien à qui des tâches sont confiées
// arrive sur les siennes ; les autres rôles voient toute la flotte.
const assigneeFilter = ref<TaskAssigneeFilter>(
  isMechanic.value && props.tasks.some((task) => task.assignee?.id === currentUserId.value)
    ? 'mine'
    : 'all'
)
const assigneeFilterOptions = computed(() => [
  { label: t('planning.assigneeFilter.all'), value: 'all' },
  { label: t('planning.assigneeFilter.mine'), value: 'mine' },
  { label: t('planning.assigneeFilter.unassigned'), value: 'unassigned' },
  ...props.maintenanceAssignees.map((a) => ({ label: a.fullName, value: a.id })),
])

// Filtre bateau et couche réservations (#869).
const boatFilter = ref<number | 'all'>('all')
const showReservations = ref(true)
const boatOptions = computed(() => {
  const names = new Map<number, string>()
  for (const item of [...props.tasks, ...props.doneTasks, ...props.reservations]) {
    names.set(item.boatId, item.boatName)
  }
  return [...names.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

function onlyMatching(tasks: PlanningTask[]): PlanningTask[] {
  return tasks.filter(
    (task) =>
      (boatFilter.value === 'all' || task.boatId === boatFilter.value) &&
      matchesAssigneeFilter(task, assigneeFilter.value, currentUserId.value)
  )
}

const visibleReservations = computed(() =>
  showReservations.value
    ? props.reservations.filter((r) => boatFilter.value === 'all' || r.boatId === boatFilter.value)
    : []
)

// Glisser-déposer (#869) : rendu optimiste, confirmation en cas de conflit.
const canReschedule = computed(() => can('maintenance.edit'))
const reschedule = usePlanningReschedule(toRef(props, 'reservations'))
const { overrides, pending, isPendingOpen } = reschedule

const columns = computed(() =>
  applyDueAtOverrides(
    {
      overdueTasks: onlyMatching(props.overdueTasks),
      soonTasks: onlyMatching(props.soonTasks),
      plannedTasks: onlyMatching(props.plannedTasks),
      undatedTasks: onlyMatching(props.undatedTasks),
    },
    overrides.value,
    todayDateInputValue()
  )
)

const filtered = computed(() => ({
  tasks: onlyMatching(props.tasks).map(reschedule.withOverride),
  ...columns.value,
  // Le serveur envoie le top de la flotte et celui de chaque assigné.
  doneTasks: onlyMatching(props.doneTasks).slice(0, PLANNING_DONE_TASKS_LIMIT),
  doneTasksTotal: doneTotalForAssigneeFilter(
    props.doneTasksTotalByAssignee,
    props.doneTasksTotal,
    assigneeFilter.value,
    currentUserId.value
  ),
  // Un groupe réduit à une tâche n'en est plus un : elle repasse en carte seule.
  groups: props.groups
    .map((group) => ({
      ...group,
      tasks: onlyMatching(group.tasks).filter((task) => !overrides.value.has(task.id)),
    }))
    .filter((group) => group.tasks.length > 1),
}))

/**
 * Tâche ciblée par `/planning?task=<id>` — le dashboard mécanicien y envoie
 * depuis ses cartes d'intervention (#473). Lu sur `page.url` (et non
 * `window.location`) pour que le SSR rende déjà la carte surlignée.
 */
const highlightedTaskId = computed(() => {
  const query = page.url.split('?')[1]
  if (!query) return null
  const raw = new URLSearchParams(query).get('task')
  if (!raw) return null
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
})

// L'action de l'état vide mène à /boats, qui exige `boats.view` : inutile de la
// proposer à un mécanicien, qui n'y récolterait qu'un 403 (#473).
const canViewBoats = computed(() => can('boats.view'))

type ViewMode = 'kanban' | 'calendar'
const viewMode = ref<ViewMode>('kanban')
const groupingEnabled = ref(true)
const dismissedGroupIds = ref(new Set<string>())

const allTasks = computed(() => [...props.tasks, ...props.doneTasks])

function handleUngroup(groupId: string) {
  dismissedGroupIds.value = new Set([...dismissedGroupIds.value, groupId])
}
</script>

<template>
  <Head :title="t('planning.title')" />

  <div class="w-full max-w-7xl flex-col px-6 py-10 sm:px-8">
    <!-- Page header -->
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <BaseHeading level="1">{{ t('planning.title') }}</BaseHeading>
        <p class="mt-1 text-sm text-fg-muted">{{ t('planning.subtitle') }}</p>
      </div>

      <PlanningToolbar
        v-model:assignee-filter="assigneeFilter"
        v-model:boat-filter="boatFilter"
        v-model:show-reservations="showReservations"
        v-model:grouping-enabled="groupingEnabled"
        v-model:view-mode="viewMode"
        :assignee-filter-options="assigneeFilterOptions"
        :show-assignee-filter="maintenanceAssignees.length > 0"
        :boat-options="boatOptions"
        :can-group-tasks="canGroupTasks"
        :has-reservations="reservations.length > 0"
      />
    </div>

    <!-- Pro teaser when starter plan -->
    <div
      v-if="!canGroupTasks && tasks.length > 0"
      class="mb-4 flex items-center gap-3 rounded-lg border border-border bg-brand-soft px-4 py-3 text-sm text-brand"
    >
      <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
      {{ t('planning.grouping.proTeaser') }}
    </div>

    <!-- Empty state -->
    <div v-if="allTasks.length === 0">
      <BaseEmptyState
        :title="t('planning.empty.title')"
        :description="t('planning.empty.description')"
        :action-label="canViewBoats ? t('planning.empty.action') : undefined"
        @action="router.visit('/boats')"
      />
    </div>

    <PlanningKanban
      v-else-if="viewMode === 'kanban'"
      :overdue-tasks="filtered.overdueTasks"
      :soon-tasks="filtered.soonTasks"
      :planned-tasks="filtered.plannedTasks"
      :undated-tasks="filtered.undatedTasks"
      :done-tasks="filtered.doneTasks"
      :done-tasks-total="filtered.doneTasksTotal"
      :groups="filtered.groups"
      :grouping-enabled="groupingEnabled"
      :dismissed-group-ids="dismissedGroupIds"
      :highlighted-task-id="highlightedTaskId"
      :reservations="visibleReservations"
      :can-reschedule="canReschedule"
      @ungroup="handleUngroup"
      @reschedule="reschedule.request"
    />

    <PlanningCalendar
      v-else
      :tasks="filtered.tasks"
      :reservations="visibleReservations"
      :can-reschedule="canReschedule"
      @reschedule="reschedule.request"
    />

    <!-- Déplacement sur une réservation confirmée (#869) : on prévient, on ne bloque pas. -->
    <BaseConfirmModal
      v-model:open="isPendingOpen"
      :title="t('planning.drag.conflictTitle')"
      :message="
        pending
          ? t('planning.drag.conflictMessage', {
              task: pending.task.title,
              boat: pending.task.boatName,
              client: pending.conflict.clientName,
              date: pending.dueAt ? formatDate(pending.dueAt) : '',
            })
          : undefined
      "
      :confirm-label="t('planning.drag.conflictConfirm')"
      @confirm="reschedule.confirmPending"
    />
  </div>
</template>
