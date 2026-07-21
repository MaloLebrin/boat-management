<script setup lang="ts">
import type { PlanningTask } from '#shared/types/planning'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import { maintenanceSubjectLabel } from '~/utils/boat_enum_labels'

const props = defineProps<{
  task: PlanningTask
  accentClass?: string
  badgeClass?: string
  done?: boolean
}>()

const { t } = useT()

function formatDue(task: PlanningTask): string {
  if (task.kind === 'date' && task.dueAt) return task.dueAt
  if (task.kind === 'hours' && task.dueEngineHours !== null) return `${task.dueEngineHours}h`
  return '—'
}
</script>

<template>
  <div
    class="rounded-lg border border-border bg-surface-elevated p-3"
    :class="accentClass ? `border-l-4 ${accentClass}` : ''"
  >
    <p class="text-xs font-medium text-fg-muted">{{ task.boatName }}</p>
    <p class="mt-1 text-sm font-semibold text-fg" :class="done ? 'line-through' : ''">
      {{ task.title }}
    </p>
    <p class="mt-1 text-xs text-fg-muted">{{ maintenanceSubjectLabel(t, task.subject) }}</p>
    <div class="mt-2 flex items-center justify-between">
      <span
        class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
        :class="badgeClass ?? 'bg-surface-muted text-fg-muted'"
      >
        {{ formatDue(task) }}
      </span>
      <BaseButton variant="ghost" size="sm" route="boats.show" :params="{ id: task.boatId }">
        {{ t('planning.taskKind.' + task.kind) }}
      </BaseButton>
    </div>
  </div>
</template>
