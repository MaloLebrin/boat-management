<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseSkeleton from '~/components/base/BaseSkeleton.vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type { DashboardFleetMargin } from '#shared/types/reporting'

/** `undefined` = prop différée pas encore arrivée (squelette). */
defineProps<{ fleetMargin: DashboardFleetMargin | undefined }>()

const { t } = useT()
const { formatCurrencyNoDecimals } = useNumberFormat()
</script>

<template>
  <!-- Widget « Marge du mois » (galerie, #887) : revenus de location − coûts du
       mois civil, lus par le même service que la page Reporting. -->
  <BaseCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 class="text-sm font-semibold text-fg">{{ t('dashboard.fleetMargin.title') }}</h2>
        <Link
          href="/reports"
          data-testid="dashboard-margin-view-all"
          class="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline"
        >
          {{ t('dashboard.fleetMargin.viewAll') }}
        </Link>
      </div>
    </template>

    <div v-if="fleetMargin === undefined" class="space-y-3" data-testid="dashboard-margin-skeleton">
      <BaseSkeleton height-class="h-8" width-class="w-1/3" />
      <BaseSkeleton height-class="h-5" />
    </div>

    <p
      v-else-if="fleetMargin.costs === 0 && fleetMargin.rentalRevenue === 0"
      class="text-sm text-fg-muted"
      data-testid="dashboard-margin-empty"
    >
      {{ t('dashboard.fleetMargin.empty') }}
    </p>

    <template v-else>
      <p
        class="font-display text-2xl font-bold tracking-tight"
        :class="fleetMargin.margin < 0 ? 'text-danger' : 'text-fg'"
        data-testid="dashboard-margin-value"
      >
        {{ formatCurrencyNoDecimals(fleetMargin.margin) }}
      </p>
      <p class="mt-1 text-xs text-fg-subtle">
        {{
          t('dashboard.fleetMargin.previous', {
            amount: formatCurrencyNoDecimals(fleetMargin.previousMargin),
          })
        }}
      </p>
      <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt class="text-fg-muted">{{ t('dashboard.fleetMargin.revenue') }}</dt>
          <dd class="font-semibold text-fg">
            {{ formatCurrencyNoDecimals(fleetMargin.rentalRevenue) }}
          </dd>
        </div>
        <div>
          <dt class="text-fg-muted">{{ t('dashboard.fleetMargin.costs') }}</dt>
          <dd class="font-semibold text-fg">{{ formatCurrencyNoDecimals(fleetMargin.costs) }}</dd>
        </div>
      </dl>
      <p
        v-if="fleetMargin.topCostBoat"
        class="mt-3 text-xs text-fg-muted"
        data-testid="dashboard-margin-top-boat"
      >
        {{
          t('dashboard.fleetMargin.topBoat', {
            name: fleetMargin.topCostBoat.name,
            amount: formatCurrencyNoDecimals(fleetMargin.topCostBoat.costs),
          })
        }}
      </p>
    </template>
  </BaseCard>
</template>
