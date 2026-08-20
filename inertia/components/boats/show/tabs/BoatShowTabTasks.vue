<script setup lang="ts">
import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { computed, ref } from 'vue'
import BoatMaintenanceTasksPanel from '~/components/boats/maintenance/BoatMaintenanceTasksPanel.vue'
import BoatTaskActions from '~/components/boats/maintenance/BoatTaskActions.vue'
import BoatTaskUrgentCard from '~/components/boats/maintenance/BoatTaskUrgentCard.vue'
import { subjectLabel } from '~/components/boats/maintenance/utils'
import { engineKindLabel, sailTypeLabel } from '~/utils/boat_enum_labels'
import type { BoatCreateIntent, BoatShowDetail, MaintenanceTaskRow } from '~/types/boat_show'
import { useT } from '~/composables/use_t'
import { useDateFormat } from '~/composables/use_date_format'

const props = withDefaults(
  defineProps<{
    boat: BoatShowDetail
    maintenanceTasks: MaintenanceTaskRow[]
    canManageMaintenance: boolean
    createIntent?: BoatCreateIntent
  }>(),
  { createIntent: null }
)

defineEmits<{ createIntentConsumed: [] }>()

const { t } = useT()
const { formatDate } = useDateFormat()

const tasksFilter = ref<'all' | 'overdue' | 'soon' | 'planned' | 'undated'>('all')

const todayIso = computed(() => new Date().toISOString().slice(0, 10))

const openTasks = computed(() => props.maintenanceTasks.filter((t) => t.status === 'open'))

const overdueTasks = computed(() =>
  openTasks.value.filter((t) => t.dueAt && String(t.dueAt) <= todayIso.value)
)

const soonTasks = computed(() => {
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  const soonIso = thirtyDaysFromNow.toISOString().slice(0, 10)
  return openTasks.value.filter(
    (t) => t.dueAt && String(t.dueAt) > todayIso.value && String(t.dueAt) <= soonIso
  )
})

const plannedTasks = computed(() => {
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  const soonIso = thirtyDaysFromNow.toISOString().slice(0, 10)
  return openTasks.value.filter((t) => t.dueAt && String(t.dueAt) > soonIso)
})

const undatedTasks = computed(() => {
  return openTasks.value.filter((t) => !t.dueAt)
})

const filteredTasks = computed(() => {
  switch (tasksFilter.value) {
    case 'overdue':
      return overdueTasks.value
    case 'soon':
      return soonTasks.value
    case 'planned':
      return plannedTasks.value
    case 'undated':
      return undatedTasks.value
    default:
      return openTasks.value
  }
})

function getTaskComponentLabel(task: MaintenanceTaskRow): string {
  if (task.subject === 'engine' && task.boatEngineId) {
    const engine = props.boat.engines.find((e) => e.id === task.boatEngineId)
    if (engine) {
      return [engineKindLabel(t, engine.kind), engine.brand, engine.model].filter(Boolean).join(' ')
    }
  }
  if (task.subject === 'sail' && task.boatSailId) {
    const sail = props.boat.sails.find((s) => s.id === task.boatSailId)
    if (sail) return sailTypeLabel(t, sail.sailType) ?? sail.sailType
  }
  return subjectLabel(t, task.subject)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header with filter pills -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="filter in [
            { key: 'all', label: t('boats.show.tasksFilter.all') },
            {
              key: 'overdue',
              label: t('boats.show.tasksFilter.overdue'),
              count: overdueTasks.length,
            },
            { key: 'soon', label: t('boats.show.tasksFilter.soon'), count: soonTasks.length },
            {
              key: 'planned',
              label: t('boats.show.tasksFilter.planned'),
              count: plannedTasks.length,
            },
            {
              key: 'undated',
              label: t('boats.show.tasksFilter.undated'),
              count: undatedTasks.length,
            },
          ]"
          :key="filter.key"
          type="button"
          :class="[
            'rounded-full px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-2',
            tasksFilter === filter.key
              ? 'bg-brand text-white'
              : 'bg-surface-muted text-fg-muted hover:bg-surface-elevated hover:text-fg',
          ]"
          @click="tasksFilter = filter.key as typeof tasksFilter"
        >
          {{ filter.label }}
          <span
            v-if="filter.count !== undefined && filter.count > 0"
            :class="[
              'rounded-full px-2 py-0.5 text-xs font-semibold',
              tasksFilter === filter.key ? 'bg-white/20' : 'bg-surface-elevated',
            ]"
          >
            {{ filter.count }}
          </span>
        </button>
      </div>
    </div>

    <!-- Overdue section -->
    <div
      v-if="(tasksFilter === 'all' || tasksFilter === 'overdue') && overdueTasks.length > 0"
      class="space-y-3"
    >
      <h3 class="flex items-center gap-2 text-sm font-semibold text-coral-700">
        <ExclamationTriangleIcon class="h-4 w-4" />
        {{ t('boats.show.status.urgent') }}
      </h3>
      <div class="space-y-3 border-l-4 border-coral-400 pl-4">
        <BoatTaskUrgentCard
          v-for="task in overdueTasks"
          :key="task.id"
          tone="overdue"
          :task="task"
          :boat-id="boat.id"
          :component-label="getTaskComponentLabel(task)"
          :can-manage="canManageMaintenance"
        />
      </div>
    </div>

    <!-- Soon section -->
    <div
      v-if="(tasksFilter === 'all' || tasksFilter === 'soon') && soonTasks.length > 0"
      class="space-y-3"
    >
      <h3 class="flex items-center gap-2 text-sm font-semibold text-amber-700">
        <ClockIcon class="h-4 w-4" />
        {{ t('boats.show.status.dueSoon') }}
      </h3>
      <div class="space-y-3 border-l-4 border-amber-400 pl-4">
        <BoatTaskUrgentCard
          v-for="task in soonTasks"
          :key="task.id"
          tone="soon"
          :task="task"
          :boat-id="boat.id"
          :component-label="getTaskComponentLabel(task)"
          :can-manage="canManageMaintenance"
        />
      </div>
    </div>

    <!-- Planned section -->
    <div
      v-if="(tasksFilter === 'all' || tasksFilter === 'planned') && plannedTasks.length > 0"
      class="space-y-3"
    >
      <h3 class="text-sm font-semibold text-fg-muted">{{ t('boats.show.tasksFilter.planned') }}</h3>
      <div class="space-y-2">
        <div
          v-for="task in plannedTasks"
          :key="task.id"
          class="flex items-center justify-between rounded-lg border border-border bg-surface-elevated px-4 py-3"
        >
          <div>
            <p class="font-semibold text-fg">{{ task.title }}</p>
            <p class="text-sm text-fg-muted">{{ getTaskComponentLabel(task) }}</p>
            <p v-if="task.notes" class="mt-1 text-sm text-fg-muted">{{ task.notes }}</p>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="task.dueAt" class="text-sm text-fg-subtle">{{
              formatDate(task.dueAt)
            }}</span>
            <span v-else-if="task.dueEngineHours !== null" class="text-sm text-fg-subtle">
              {{ task.dueEngineHours }}h
            </span>
            <BoatTaskActions
              v-if="canManageMaintenance"
              :boat-id="boat.id"
              :task="task"
              done-variant="ghost"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Undated section -->
    <div
      v-if="(tasksFilter === 'all' || tasksFilter === 'undated') && undatedTasks.length > 0"
      class="space-y-3"
    >
      <h3 class="text-sm font-semibold text-fg-muted">{{ t('boats.show.tasksFilter.undated') }}</h3>
      <div class="space-y-2">
        <div
          v-for="task in undatedTasks"
          :key="task.id"
          class="flex items-center justify-between rounded-lg border border-border bg-surface-elevated px-4 py-3"
        >
          <div>
            <p class="font-semibold text-fg">{{ task.title }}</p>
            <p class="text-sm text-fg-muted">{{ getTaskComponentLabel(task) }}</p>
            <p v-if="task.notes" class="mt-1 text-sm text-fg-muted">{{ task.notes }}</p>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="task.dueEngineHours !== null" class="text-sm text-fg-subtle">
              {{ task.dueEngineHours }}h
            </span>
            <BoatTaskActions
              v-if="canManageMaintenance"
              :boat-id="boat.id"
              :task="task"
              done-variant="ghost"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state: only shown when the active filter has no match but other
         open tasks exist elsewhere — when there are none at all, the panel
         below already owns the empty message + creation CTA. -->
    <div
      v-if="filteredTasks.length === 0 && openTasks.length > 0"
      class="rounded-lg border border-dashed border-border bg-surface-muted/30 p-8 text-center"
    >
      <p class="text-fg-muted">{{ t('boats.maintenance.tasks.emptyFiltered') }}</p>
    </div>

    <!-- Tasks panel for creation -->
    <div class="mt-8 pt-8 border-t border-border">
      <BoatMaintenanceTasksPanel
        :boat="boat"
        :tasks="maintenanceTasks"
        :can-manage-maintenance="canManageMaintenance"
        :create-intent="createIntent"
        @create-intent-consumed="$emit('createIntentConsumed')"
      />
    </div>
  </div>
</template>
