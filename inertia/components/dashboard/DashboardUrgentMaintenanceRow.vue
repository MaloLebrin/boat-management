<script setup lang="ts">
import { computed } from 'vue'
import { Link } from '@adonisjs/inertia/vue'
import type { DashboardUrgentMaintenanceRow } from '#shared/types/dashboard'
import { useT } from '~/composables/use_t'
import { useDateFormat } from '~/composables/use_date_format'
import { maintenanceSubjectLabel } from '~/utils/boat_enum_labels'

const props = defineProps<{
  row: DashboardUrgentMaintenanceRow
  /** Calculé par le parent avec `isDueDateOverdue` : la ligne reste pure. */
  overdue: boolean
}>()

const { t } = useT()
const { formatDate } = useDateFormat()

/**
 * Toute la ligne ouvre le planning centré sur la tâche (#473), comme
 * `MechanicInterventionRow`. La fiche bateau reste accessible depuis la carte
 * « Vos bateaux » : pas de second lien imbriqué.
 */
const href = computed(() => `/planning?task=${props.row.id}`)

const pill = computed(() => {
  if (props.row.kind !== 'date') {
    return { label: t('dashboard.urgentMaintenance.hours'), tone: 'hours' as const }
  }
  return props.overdue
    ? { label: t('dashboard.urgentMaintenance.overdue'), tone: 'overdue' as const }
    : { label: t('dashboard.urgentMaintenance.dueSoon'), tone: 'soon' as const }
})

const pillClass: Record<'overdue' | 'soon' | 'hours', string> = {
  overdue: 'bg-danger/10 text-danger ring-1 ring-danger/20',
  soon: 'bg-warning/10 text-warning ring-1 ring-warning/20',
  hours: 'bg-sky-700/10 text-sky-800 ring-1 ring-sky-700/20',
}
</script>

<template>
  <li>
    <Link
      :href="href"
      :aria-label="
        t('dashboard.urgentMaintenance.openTask', { title: row.title, boat: row.boatName })
      "
      data-testid="dashboard-urgent-row"
      class="block min-h-11 rounded-(--radius-control) border border-border bg-surface-muted/40 p-3 transition-colors hover:border-border-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="font-semibold text-fg">{{ row.boatName }}</p>
          <p class="mt-1 text-sm text-fg-muted">
            {{ row.title }} - {{ maintenanceSubjectLabel(t, row.subject) }}
          </p>
        </div>
        <span
          class="shrink-0 rounded-full px-2 py-1 text-xs font-semibold"
          :class="pillClass[pill.tone]"
        >
          {{ pill.label }}
        </span>
      </div>
      <p v-if="row.kind === 'date'" class="mt-2 text-xs text-fg-subtle">
        {{
          t('dashboard.urgentMaintenance.dueAt', { date: row.dueAt ? formatDate(row.dueAt) : '—' })
        }}
      </p>
      <p v-else class="mt-2 text-xs text-fg-subtle">
        {{
          t('dashboard.urgentMaintenance.dueAtHours', {
            hours: String(row.dueEngineHours ?? 0),
            current: String(row.currentEngineHours ?? 0),
          })
        }}
      </p>
    </Link>
  </li>
</template>
