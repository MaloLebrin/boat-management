<script setup lang="ts">
import type { PlanningTask } from '#shared/types/planning'
import { useT } from '~/composables/use_t'
import { useDateFormat } from '~/composables/use_date_format'
import { maintenanceSubjectLabel } from '~/utils/boat_enum_labels'

defineProps<{
  task: PlanningTask
  tone: 'overdue' | 'soon'
}>()

const { t } = useT()
const { formatDate } = useDateFormat()
</script>

<template>
  <li class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-3">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="font-semibold text-fg">{{ task.boatName }}</p>
        <p class="mt-1 text-sm text-fg-muted">
          {{ task.title }} - {{ maintenanceSubjectLabel(t, task.subject) }}
        </p>
      </div>
      <span
        class="shrink-0 rounded-full px-2 py-1 text-xs font-semibold"
        :class="
          tone === 'overdue'
            ? 'bg-danger/10 text-danger ring-1 ring-danger/20'
            : 'bg-amber-500/10 text-amber-800 ring-1 ring-amber-500/20'
        "
      >
        {{ tone === 'overdue' ? t('dashboard.mechanic.overdue') : t('dashboard.mechanic.dueSoon') }}
      </span>
    </div>
    <p v-if="task.kind === 'date'" class="mt-2 text-xs text-fg-subtle">
      {{ t('dashboard.mechanic.dueAt', { date: task.dueAt ? formatDate(task.dueAt) : '—' }) }}
    </p>
    <p v-else class="mt-2 text-xs text-fg-subtle">
      {{
        t('dashboard.mechanic.dueAtHours', {
          hours: String(task.dueEngineHours ?? 0),
          current: String(task.currentEngineHours ?? 0),
        })
      }}
    </p>
  </li>
</template>
