<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseSkeleton from '~/components/base/BaseSkeleton.vue'
import type { DashboardCharterOccupancy } from '#shared/types/dashboard'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'

/** `undefined` = prop différée pas encore arrivée (squelette). */
defineProps<{ charterOccupancy: DashboardCharterOccupancy | undefined }>()

const { t } = useT()
const { formatNumber, formatCurrencyNoDecimals } = useNumberFormat()
</script>

<template>
  <!-- Widget « Occupation location » (galerie, module Location) : taux
       d'occupation confirmé de la flotte sur 30 jours, options et CA confirmé. -->
  <BaseCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 class="text-sm font-semibold text-fg">{{ t('dashboard.charterOccupancy.title') }}</h2>
        <Link
          href="/reservations"
          data-testid="dashboard-occupancy-view-all"
          class="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline"
        >
          {{ t('dashboard.charterOccupancy.viewAll') }}
        </Link>
      </div>
      <p v-if="charterOccupancy" class="mt-1 text-xs font-medium text-fg-muted">
        {{ t('dashboard.charterOccupancy.period', { days: String(charterOccupancy.windowDays) }) }}
      </p>
    </template>

    <div
      v-if="charterOccupancy === undefined"
      class="space-y-3"
      data-testid="dashboard-occupancy-skeleton"
    >
      <BaseSkeleton height-class="h-8" width-class="w-1/3" />
      <BaseSkeleton height-class="h-2" />
      <BaseSkeleton height-class="h-5" />
    </div>

    <p
      v-else-if="charterOccupancy.confirmed === 0 && charterOccupancy.options === 0"
      class="text-sm text-fg-muted"
      data-testid="dashboard-occupancy-empty"
    >
      {{ t('dashboard.charterOccupancy.empty') }}
    </p>

    <template v-else>
      <p
        class="font-display text-2xl font-bold tracking-tight text-fg"
        data-testid="dashboard-occupancy-rate"
      >
        {{ t('dashboard.charterOccupancy.rate', { rate: String(charterOccupancy.occupancyRate) }) }}
      </p>
      <div
        class="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        :aria-valuenow="charterOccupancy.occupancyRate"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="t('dashboard.charterOccupancy.title')"
      >
        <div
          class="h-full rounded-full bg-brand"
          data-testid="dashboard-occupancy-bar"
          :style="{ width: `${charterOccupancy.occupancyRate}%` }"
        />
      </div>
      <p class="mt-1 text-xs text-fg-subtle">
        {{
          t('dashboard.charterOccupancy.boatDays', {
            days: formatNumber(charterOccupancy.reservedBoatDays),
            boats: String(charterOccupancy.boats),
          })
        }}
      </p>

      <dl class="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt class="text-xs font-medium text-fg-muted">
            {{ t('dashboard.charterOccupancy.confirmed') }}
          </dt>
          <dd class="font-semibold text-fg" data-testid="dashboard-occupancy-confirmed">
            {{ charterOccupancy.confirmed }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium text-fg-muted">
            {{ t('dashboard.charterOccupancy.options') }}
          </dt>
          <dd class="font-semibold text-fg" data-testid="dashboard-occupancy-options">
            {{ charterOccupancy.options }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium text-fg-muted">
            {{ t('dashboard.charterOccupancy.revenue') }}
          </dt>
          <dd class="font-semibold text-fg" data-testid="dashboard-occupancy-revenue">
            {{ formatCurrencyNoDecimals(charterOccupancy.confirmedRevenue) }}
          </dd>
        </div>
      </dl>
    </template>
  </BaseCard>
</template>
