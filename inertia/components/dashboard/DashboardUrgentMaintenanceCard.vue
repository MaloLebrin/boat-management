<script setup lang="ts">
import { computed } from 'vue'
import { Link } from '@adonisjs/inertia/vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import DashboardUrgentMaintenanceRow from '~/components/dashboard/DashboardUrgentMaintenanceRow.vue'
import type { DashboardUrgentMaintenanceRow as UrgentRow } from '#shared/types/dashboard'
import { URGENT_DISPLAY_CAP } from '#shared/constants/dashboard'
import { isDueDateOverdue } from '#shared/helpers/maintenance'
import { useT } from '~/composables/use_t'
import { todayDateInputValue } from '~/utils/local_datetime'

const props = withDefaults(
  defineProps<{
    rows: UrgentRow[]
    /** `stats.deltas.overdueCount` — tâches datées dont l'échéance est passée. */
    overdueCount: number
    /** `stats.urgentMaintenance` — total urgent (retard + bientôt dû + heures). */
    total: number
    /** Jour courant `YYYY-MM-DD` (date locale) ; injectable en test. */
    todayIso?: string
  }>(),
  { todayIso: undefined }
)

const { t } = useT()

const today = computed(() => props.todayIso ?? todayDateInputValue())
const displayed = computed(() => props.rows.slice(0, URGENT_DISPLAY_CAP))
const remaining = computed(() => Math.max(props.rows.length - URGENT_DISPLAY_CAP, 0))

function isOverdue(row: UrgentRow): boolean {
  return row.kind === 'date' && row.dueAt !== null && isDueDateOverdue(row.dueAt, today.value)
}
</script>

<template>
  <BaseCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <h2 class="text-sm font-semibold text-fg">
            {{ t('dashboard.urgentMaintenance.title') }}
            <span v-if="total > 0" class="text-fg-muted">· {{ total }}</span>
          </h2>
          <!-- Le compteur de retard (et non le total urgent) : l'ancienne
               alerte de page annonçait « 10 tâches en retard » pour 3 (#828). -->
          <BaseBadge v-if="overdueCount > 0" variant="danger" data-testid="dashboard-overdue-badge">
            {{ t('dashboard.overdueAlert', { count: String(overdueCount) }) }}
          </BaseBadge>
        </div>
        <Link
          href="/planning"
          class="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline"
        >
          {{ t('dashboard.viewPlanning') }}
        </Link>
      </div>
      <p class="mt-1 text-xs font-medium text-fg-muted">
        {{ t('dashboard.urgentMaintenance.period') }}
      </p>
    </template>

    <div v-if="rows.length === 0" class="text-sm text-fg-muted">
      {{ t('dashboard.urgentMaintenance.empty') }}
    </div>

    <ul v-else class="space-y-3 text-sm">
      <DashboardUrgentMaintenanceRow
        v-for="row in displayed"
        :key="row.id"
        :row="row"
        :overdue="isOverdue(row)"
      />
    </ul>

    <template v-if="remaining > 0" #footer>
      <Link
        href="/planning"
        data-testid="dashboard-urgent-view-more"
        class="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand hover:underline"
      >
        {{ t('dashboard.urgentMaintenance.viewMore', { count: String(remaining) }) }}
        <span aria-hidden="true">&rarr;</span>
      </Link>
    </template>
  </BaseCard>
</template>
