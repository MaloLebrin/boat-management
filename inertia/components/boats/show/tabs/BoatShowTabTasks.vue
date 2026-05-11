<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BoatMaintenanceTasksPanel from '~/components/boats/maintenance/BoatMaintenanceTasksPanel.vue'
import { subjectLabel } from '~/components/boats/maintenance/utils'
import type { BoatShowDetail, MaintenanceTaskRow } from '~/types/boat_show'

const props = defineProps<{
  boat: BoatShowDetail
  maintenanceTasks: MaintenanceTaskRow[]
  canManageMaintenance: boolean
  createTaskNonce: number
}>()

const tasksFilter = ref<'all' | 'overdue' | 'soon' | 'planned'>('all')

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
  return openTasks.value.filter((t) => !t.dueAt || String(t.dueAt) > soonIso)
})

const filteredTasks = computed(() => {
  switch (tasksFilter.value) {
    case 'overdue':
      return overdueTasks.value
    case 'soon':
      return soonTasks.value
    case 'planned':
      return plannedTasks.value
    default:
      return openTasks.value
  }
})

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

function getTaskComponentLabel(task: MaintenanceTaskRow): string {
  if (task.subject === 'engine' && task.boatEngineId) {
    const engine = props.boat.engines.find((e) => e.id === task.boatEngineId)
    if (engine) return `${engine.kind} ${engine.brand ?? ''} ${engine.model ?? ''}`.trim()
  }
  if (task.subject === 'sail' && task.boatSailId) {
    const sail = props.boat.sails.find((s) => s.id === task.boatSailId)
    if (sail) return sail.sailType
  }
  if (task.subject === 'rig') return 'Greement'
  return subjectLabel(task.subject)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header with filter pills -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap gap-2">
        <button v-for="filter in [
          { key: 'all', label: 'Toutes' },
          { key: 'overdue', label: 'En retard', count: overdueTasks.length },
          { key: 'soon', label: 'Bientot', count: soonTasks.length },
          { key: 'planned', label: 'Planifiees', count: plannedTasks.length },
        ]" :key="filter.key" type="button" :class="[
          'rounded-full px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-2',
          tasksFilter === filter.key
            ? 'bg-brand text-white'
            : 'bg-surface-muted text-fg-muted hover:bg-surface-elevated hover:text-fg',
        ]" @click="tasksFilter = filter.key as typeof tasksFilter">
          {{ filter.label }}
          <span v-if="filter.count !== undefined && filter.count > 0" :class="[
            'rounded-full px-2 py-0.5 text-xs font-semibold',
            tasksFilter === filter.key ? 'bg-white/20' : 'bg-surface-elevated',
          ]">
            {{ filter.count }}
          </span>
        </button>
      </div>
    </div>

    <!-- Overdue section -->
    <div v-if="(tasksFilter === 'all' || tasksFilter === 'overdue') && overdueTasks.length > 0" class="space-y-3">
      <h3 class="flex items-center gap-2 text-sm font-semibold text-coral-700">
        <ExclamationTriangleIcon class="h-4 w-4" />
        En retard
      </h3>
      <div class="space-y-3 border-l-4 border-coral-400 pl-4">
        <div v-for="task in overdueTasks" :key="task.id" class="rounded-lg border border-coral-200 bg-coral-50 p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="font-semibold text-fg">{{ task.title }}</p>
              <p class="text-sm text-fg-muted">{{ getTaskComponentLabel(task) }}</p>
              <p v-if="task.dueAt" class="mt-1 text-xs text-coral-700">
                Echeance: {{ formatDate(task.dueAt) }}
              </p>
              <p v-else-if="task.dueEngineHours !== null" class="mt-1 text-xs text-coral-700">
                A {{ task.dueEngineHours }} heures moteur
              </p>
            </div>
            <div v-if="canManageMaintenance" class="flex items-center gap-2">
              <Form :action="{ url: `/boats/${boat.id}/maintenance-tasks/${task.id}/done`, method: 'put' }"
                #default="{ processing }">
                <BaseButton type="submit" variant="secondary" size="sm" :disabled="processing">
                  Marquer fait
                </BaseButton>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Soon section -->
    <div v-if="(tasksFilter === 'all' || tasksFilter === 'soon') && soonTasks.length > 0" class="space-y-3">
      <h3 class="flex items-center gap-2 text-sm font-semibold text-amber-700">
        <ClockIcon class="h-4 w-4" />
        A venir bientot
      </h3>
      <div class="space-y-3 border-l-4 border-amber-400 pl-4">
        <div v-for="task in soonTasks" :key="task.id" class="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="font-semibold text-fg">{{ task.title }}</p>
              <p class="text-sm text-fg-muted">{{ getTaskComponentLabel(task) }}</p>
              <p v-if="task.dueAt" class="mt-1 text-xs text-amber-700">
                Echeance: {{ formatDate(task.dueAt) }}
              </p>
            </div>
            <div v-if="canManageMaintenance" class="flex items-center gap-2">
              <Form :action="{ url: `/boats/${boat.id}/maintenance-tasks/${task.id}/done`, method: 'put' }"
                #default="{ processing }">
                <BaseButton type="submit" variant="secondary" size="sm" :disabled="processing">
                  Marquer fait
                </BaseButton>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Planned section -->
    <div v-if="(tasksFilter === 'all' || tasksFilter === 'planned') && plannedTasks.length > 0" class="space-y-3">
      <h3 class="text-sm font-semibold text-fg-muted">Planifiees</h3>
      <div class="space-y-2">
        <div v-for="task in plannedTasks" :key="task.id"
          class="flex items-center justify-between rounded-lg border border-border bg-surface-elevated px-4 py-3">
          <div>
            <p class="font-semibold text-fg">{{ task.title }}</p>
            <p class="text-sm text-fg-muted">{{ getTaskComponentLabel(task) }}</p>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="task.dueAt" class="text-sm text-fg-subtle">{{ formatDate(task.dueAt) }}</span>
            <span v-else-if="task.dueEngineHours !== null" class="text-sm text-fg-subtle">
              {{ task.dueEngineHours }}h
            </span>
            <Form v-if="canManageMaintenance"
              :action="{ url: `/boats/${boat.id}/maintenance-tasks/${task.id}/done`, method: 'put' }"
              #default="{ processing }">
              <BaseButton type="submit" variant="ghost" size="sm" :disabled="processing">
                Fait
              </BaseButton>
            </Form>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="filteredTasks.length === 0"
      class="rounded-lg border border-dashed border-border bg-surface-muted/30 p-8 text-center">
      <p class="text-fg-muted">Aucune tache correspondante.</p>
    </div>

    <!-- Tasks panel for creation -->
    <div class="mt-8 pt-8 border-t border-border">
      <BoatMaintenanceTasksPanel :boat="boat" :tasks="maintenanceTasks"
        :can-manage-maintenance="canManageMaintenance" :create-task-nonce="createTaskNonce" />
    </div>
  </div>
</template>
