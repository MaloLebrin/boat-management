<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from 'vue'
import type { PlanningTask } from '#shared/types/planning'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import { useDateFormat } from '~/composables/use_date_format'
import { usePermissions } from '~/composables/use_permissions'
import { maintenanceSubjectLabel } from '~/utils/boat_enum_labels'

const props = defineProps<{
  task: PlanningTask
  accentClass?: string
  badgeClass?: string
  done?: boolean
  /** Tâche ciblée par `/planning?task=<id>` (#473) : surlignée et amenée à l'écran. */
  highlighted?: boolean
}>()

const root = useTemplateRef<HTMLElement>('root')

onMounted(() => {
  if (!props.highlighted) return
  root.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
})

const { t } = useT()
const { formatDate } = useDateFormat()
const { can } = usePermissions()

// /boats/:id passe par BoatPolicy.view → capability `boats.view`, que le rôle
// `mechanic` n'a pas alors que /planning lui est accessible : sans ce garde, la
// carte affiche un lien qui répond 403 (#473).
const canViewBoat = computed(() => can('boats.view'))

function formatDue(task: PlanningTask): string {
  if (task.kind === 'date' && task.dueAt) return formatDate(task.dueAt)
  if (task.kind === 'hours' && task.dueEngineHours !== null) return `${task.dueEngineHours}h`
  return '—'
}
</script>

<template>
  <div
    :id="`planning-task-${task.id}`"
    ref="root"
    class="rounded-lg border border-border bg-surface-elevated p-3"
    :class="[
      accentClass ? `border-l-4 ${accentClass}` : '',
      highlighted ? 'ring-2 ring-brand ring-offset-2 ring-offset-surface' : '',
    ]"
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
      <BaseButton
        v-if="canViewBoat"
        variant="ghost"
        size="sm"
        route="boats.show"
        :params="{ id: task.boatId }"
      >
        {{ t('planning.taskKind.' + task.kind) }}
      </BaseButton>
      <span v-else class="px-3 text-xs font-semibold text-fg-muted">
        {{ t('planning.taskKind.' + task.kind) }}
      </span>
    </div>
  </div>
</template>
