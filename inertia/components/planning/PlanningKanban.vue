<script setup lang="ts">
import type { PlanningTask, TaskGroup } from '#shared/types/planning'
import PlanningTaskCard from '~/components/planning/PlanningTaskCard.vue'
import PlanningTaskGroup from '~/components/planning/PlanningTaskGroup.vue'
import { computed } from 'vue'
import { useT } from '~/composables/use_t'

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
}>()

const emit = defineEmits<{ ungroup: [groupId: string] }>()

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
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
    <!-- En retard -->
    <div class="flex flex-col gap-3">
      <div
        class="flex items-center gap-2 rounded-lg border-l-4 border-coral-500 bg-danger-soft px-3 py-2"
      >
        <h2 class="text-sm font-semibold text-coral-700">{{ t('planning.kanban.overdue') }}</h2>
        <span
          class="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-coral-600 px-1.5 text-xs font-semibold text-white"
        >
          {{ overdueTasks.length }}
        </span>
      </div>
      <div
        v-if="overdueTasks.length === 0"
        class="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted"
      >
        {{ t('planning.kanban.overdueEmpty') }}
      </div>
      <PlanningTaskCard
        v-for="task in overdueTasks"
        :key="task.id"
        :task="task"
        :highlighted="task.id === highlightedTaskId"
        accent-class="border-coral-400"
        badge-class="bg-coral-100 text-coral-700"
      />
    </div>

    <!-- À venir bientôt -->
    <div class="flex flex-col gap-3">
      <div
        class="flex items-center gap-2 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-2"
      >
        <h2 class="text-sm font-semibold text-amber-700">{{ t('planning.kanban.soon') }}</h2>
        <span
          class="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-xs font-semibold text-white"
        >
          {{ soonTasks.length }}
        </span>
      </div>
      <div
        v-if="soonTasks.length === 0"
        class="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted"
      >
        {{ t('planning.kanban.soonEmpty') }}
      </div>
      <PlanningTaskCard
        v-for="task in soonTasks"
        :key="task.id"
        :task="task"
        :highlighted="task.id === highlightedTaskId"
        accent-class="border-amber-300"
        badge-class="bg-amber-100 text-amber-700"
      />
    </div>

    <!-- Non datées -->
    <div class="flex flex-col gap-3">
      <div
        class="flex items-center gap-2 rounded-lg border-l-4 border-fg-subtle bg-surface-muted px-3 py-2"
      >
        <h2 class="text-sm font-semibold text-fg">{{ t('planning.kanban.undated') }}</h2>
        <span
          class="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-fg-subtle px-1.5 text-xs font-semibold text-white"
        >
          {{ undatedTasks.length }}
        </span>
      </div>
      <div
        v-if="undatedTasks.length === 0"
        class="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted"
      >
        {{ t('planning.kanban.undatedEmpty') }}
      </div>
      <PlanningTaskCard
        v-for="task in undatedTasks"
        :key="task.id"
        :task="task"
        :highlighted="task.id === highlightedTaskId"
        accent-class="border-fg-subtle"
        badge-class="bg-surface-muted text-fg"
      />
    </div>

    <!-- Planifiées -->
    <div class="flex flex-col gap-3">
      <!--
        Les quatre autres colonnes teintent leur en-tête avec une palette de
        marque, dont les paliers `-50`/`-700` s'inversent sous `[data-theme]`.
        Le navy, lui, est la palette des surfaces *permanentes* (sidebar, bandeaux)
        et n'est pas réinversée : `bg-navy-25` restait donc un aplat quasi blanc
        en thème sombre, seul en-tête clair du kanban (#457). Les tokens `brand`
        portent la même teinte et basculent, `text-on-brand` suivant sur la
        pastille.
      -->
      <div
        class="flex items-center gap-2 rounded-lg border-l-4 border-brand bg-brand-soft px-3 py-2"
      >
        <h2 class="text-sm font-semibold text-brand">{{ t('planning.kanban.planned') }}</h2>
        <span
          class="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold text-on-brand"
        >
          {{ plannedTasks.length }}
        </span>
      </div>
      <div
        v-if="plannedTasks.length === 0"
        class="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted"
      >
        {{ t('planning.kanban.plannedEmpty') }}
      </div>
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
      />
    </div>

    <!-- Complétées -->
    <div class="flex flex-col gap-3">
      <div
        class="flex items-center gap-2 rounded-lg border-l-4 border-mint-600 bg-mint-50 px-3 py-2"
      >
        <h2 class="text-sm font-semibold text-mint-700">{{ doneTasksLabel }}</h2>
        <span
          class="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-mint-600 px-1.5 text-xs font-semibold text-white"
        >
          {{ doneTasks.length }}
        </span>
      </div>
      <div
        v-if="doneTasks.length === 0"
        class="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted"
      >
        {{ t('planning.kanban.completedEmpty') }}
      </div>
      <PlanningTaskCard
        v-for="task in doneTasks"
        :key="task.id"
        :task="task"
        :highlighted="task.id === highlightedTaskId"
        accent-class="border-mint-600 opacity-75"
        badge-class="bg-mint-100 text-mint-700"
        :done="true"
      />
    </div>
  </div>
</template>
