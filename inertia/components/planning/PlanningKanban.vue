<script setup lang="ts">
import type { PlanningTask, TaskGroup } from '#shared/types/planning'
import BaseCard from '~/components/base/BaseCard.vue'
import PlanningTaskCard from '~/components/planning/PlanningTaskCard.vue'
import PlanningTaskGroup from '~/components/planning/PlanningTaskGroup.vue'
import { computed } from 'vue'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  overdueTasks: PlanningTask[]
  soonTasks: PlanningTask[]
  plannedTasks: PlanningTask[]
  doneTasks: PlanningTask[]
  groups: TaskGroup[]
  groupingEnabled: boolean
  dismissedGroupIds: Set<string>
}>()

const emit = defineEmits<{ ungroup: [groupId: string] }>()

const { t } = useT()

const visibleGroups = computed(() => props.groups.filter((g) => !props.dismissedGroupIds.has(g.id)))

const groupedTaskIds = computed(() => {
  if (!props.groupingEnabled) return new Set<number>()
  return new Set(visibleGroups.value.flatMap((g) => g.tasks.map((task) => task.id)))
})

function ungroupedFor(tasks: PlanningTask[]) {
  if (!props.groupingEnabled) return tasks
  return tasks.filter((task) => !groupedTaskIds.value.has(task.id))
}

const plannedGroups = computed(() =>
  visibleGroups.value.filter((g) =>
    props.plannedTasks.some((t) => g.tasks.some((gt) => gt.id === t.id))
  )
)
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <!-- En retard -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center gap-2 rounded-lg border-l-4 border-red-500 bg-red-50 px-3 py-2">
        <h2 class="text-sm font-semibold text-red-700">{{ t('planning.kanban.overdue') }}</h2>
        <span
          class="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white"
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
        v-for="task in ungroupedFor(overdueTasks)"
        :key="task.id"
        :task="task"
        accent-class="border-red-400"
        badge-class="bg-red-100 text-red-700"
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
        v-for="task in ungroupedFor(soonTasks)"
        :key="task.id"
        :task="task"
        accent-class="border-amber-300"
        badge-class="bg-amber-100 text-amber-700"
      />
    </div>

    <!-- Planifiées -->
    <div class="flex flex-col gap-3">
      <div
        class="flex items-center gap-2 rounded-lg border-l-4 border-navy-600 bg-navy-25 px-3 py-2"
      >
        <h2 class="text-sm font-semibold text-navy-600">{{ t('planning.kanban.planned') }}</h2>
        <span
          class="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-navy-600 px-1.5 text-xs font-semibold text-white"
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
        v-for="task in ungroupedFor(plannedTasks)"
        :key="task.id"
        :task="task"
        badge-class="bg-surface-muted text-fg-muted"
      />
    </div>

    <!-- Complétées -->
    <div class="flex flex-col gap-3">
      <div
        class="flex items-center gap-2 rounded-lg border-l-4 border-mint-600 bg-mint-50 px-3 py-2"
      >
        <h2 class="text-sm font-semibold text-mint-700">{{ t('planning.kanban.completed') }}</h2>
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
        accent-class="border-mint-500 opacity-75"
        badge-class="bg-mint-100 text-mint-700"
        :done="true"
      />
    </div>
  </div>
</template>
