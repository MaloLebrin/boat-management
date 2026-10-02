<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import BaseStatCard from '~/components/base/BaseStatCard.vue'
import BoatStatusBadge from '~/components/boats/BoatStatusBadge.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type { BoatStatus } from '#shared/types/boat_status'
import type { OwnerDashboard, OwnerUpcomingDeadline } from '#shared/types/owner_portal'

/** Tableau de bord du propriétaire (#890) : coût, échéances, dernière sortie, état. */
defineProps<{ dashboard: OwnerDashboard }>()

const { t } = useT()
const { formatDate } = useDateFormat()
const { formatCurrency } = useNumberFormat()

function deadlineLabel(deadline: OwnerUpcomingDeadline): string {
  if (deadline.label || !deadline.documentType) return deadline.label
  return t(`boats.adminDocs.types.${deadline.documentType}`)
}
</script>

<template>
  <div class="flex flex-col gap-4" data-testid="owner-dashboard">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <BaseStatCard
        :label="t('owner.boats.show.dashboard.cost12Months')"
        :value="formatCurrency(dashboard.totalCost12Months)"
      />
      <BaseStatCard
        :label="t('owner.boats.show.dashboard.pendingApprovals')"
        :value="String(dashboard.pendingApprovals)"
      />
      <BaseCard>
        <p class="text-xs font-medium text-fg-muted">
          {{ t('owner.boats.show.dashboard.status') }}
        </p>
        <div class="mt-2">
          <BoatStatusBadge :status="dashboard.status as BoatStatus" />
        </div>
      </BaseCard>
    </div>

    <BaseCard>
      <h3 class="mb-3 text-sm font-semibold text-fg">
        {{ t('owner.boats.show.dashboard.upcoming') }}
      </h3>
      <p v-if="dashboard.upcomingDeadlines.length === 0" class="text-sm text-fg-muted">
        {{ t('owner.boats.show.dashboard.noUpcoming') }}
      </p>
      <ul v-else class="flex flex-col gap-2">
        <li
          v-for="deadline in dashboard.upcomingDeadlines"
          :key="`${deadline.kind}-${deadline.id}`"
          class="flex items-center justify-between gap-4 text-sm"
        >
          <span class="text-fg">{{ deadlineLabel(deadline) }}</span>
          <span class="shrink-0 text-fg-muted">{{ formatDate(deadline.date) }}</span>
        </li>
      </ul>
    </BaseCard>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <BaseCard>
        <h3 class="mb-3 text-sm font-semibold text-fg">
          {{ t('owner.boats.show.dashboard.byCategory') }}
        </h3>
        <p v-if="dashboard.costByCategory.length === 0" class="text-sm text-fg-muted">
          {{ t('owner.boats.show.dashboard.noExpenses') }}
        </p>
        <ul v-else class="flex flex-col gap-2">
          <li
            v-for="row in dashboard.costByCategory"
            :key="row.category"
            class="flex items-center justify-between text-sm"
          >
            <span class="text-fg">{{ t(`budget.entries.categories.${row.category}`) }}</span>
            <span class="font-medium text-fg">{{ formatCurrency(row.total) }}</span>
          </li>
        </ul>
      </BaseCard>
      <BaseCard>
        <h3 class="mb-3 text-sm font-semibold text-fg">
          {{ t('owner.boats.show.dashboard.lastTrip') }}
        </h3>
        <p v-if="!dashboard.lastTrip" class="text-sm text-fg-muted">
          {{ t('owner.boats.show.dashboard.noTrip') }}
        </p>
        <div v-else class="text-sm">
          <p class="text-fg">{{ formatDate(dashboard.lastTrip.departedAt) }}</p>
          <p class="text-fg-muted">
            {{
              [dashboard.lastTrip.departurePortName, dashboard.lastTrip.arrivalPortName]
                .filter(Boolean)
                .join(' → ')
            }}
          </p>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
