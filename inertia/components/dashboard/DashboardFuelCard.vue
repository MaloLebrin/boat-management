<script setup lang="ts">
import { computed } from 'vue'
import { Link } from '@adonisjs/inertia/vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseSkeleton from '~/components/base/BaseSkeleton.vue'
import type { DashboardFuelSummary } from '#shared/types/dashboard'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'

/** `undefined` = prop différée pas encore arrivée (squelette). */
const props = defineProps<{ fuel: DashboardFuelSummary | undefined }>()

const { t } = useT()
const { formatNumber, formatCurrency, formatCurrencyNoDecimals } = useNumberFormat()

// Même règle que « Dépenses » : une consommation en hausse s'affiche en danger.
const delta = computed(() => {
  const fuel = props.fuel
  if (!fuel?.previous || fuel.previous.liters === 0) return null
  const pct = Math.abs(
    Math.round(((fuel.liters - fuel.previous.liters) / fuel.previous.liters) * 100)
  )
  return fuel.liters >= fuel.previous.liters
    ? { label: t('dashboard.fuel.increase', { pct: String(pct) }), positive: false }
    : { label: t('dashboard.fuel.decrease', { pct: String(pct) }), positive: true }
})
</script>

<template>
  <!-- Widget « Carburant » (galerie) : les pleins des 30 derniers jours,
       comparés aux 30 jours précédents. -->
  <BaseCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 class="text-sm font-semibold text-fg">{{ t('dashboard.fuel.title') }}</h2>
        <Link
          href="/navigation/fuel"
          data-testid="dashboard-fuel-view-all"
          class="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline"
        >
          {{ t('dashboard.fuel.viewAll') }}
        </Link>
      </div>
      <p v-if="fuel" class="mt-1 text-xs font-medium text-fg-muted">
        {{ t('dashboard.fuel.period', { days: String(fuel.windowDays) }) }}
      </p>
    </template>

    <div v-if="fuel === undefined" class="space-y-3" data-testid="dashboard-fuel-skeleton">
      <BaseSkeleton height-class="h-8" width-class="w-1/2" />
      <BaseSkeleton v-for="i in 2" :key="i" height-class="h-5" />
    </div>

    <p
      v-else-if="fuel.fillUps === 0"
      class="text-sm text-fg-muted"
      data-testid="dashboard-fuel-empty"
    >
      {{ t('dashboard.fuel.empty') }}
    </p>

    <template v-else>
      <p
        class="font-display text-2xl font-bold tracking-tight text-fg"
        data-testid="dashboard-fuel-liters"
      >
        {{ t('dashboard.fuel.liters', { liters: formatNumber(fuel.liters) }) }}
      </p>
      <p class="mt-1 text-xs text-fg-subtle" data-testid="dashboard-fuel-delta">
        <template v-if="delta">
          <span :class="delta.positive ? 'text-success' : 'text-danger'" class="font-semibold">
            {{ delta.label }}
          </span>
          {{ t('dashboard.fuel.vsPrevious') }}
        </template>
        <template v-else>{{ t('dashboard.fuel.noComparison') }}</template>
      </p>

      <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt class="text-xs font-medium text-fg-muted">{{ t('dashboard.fuel.cost') }}</dt>
          <dd class="font-semibold text-fg" data-testid="dashboard-fuel-cost">
            {{ formatCurrencyNoDecimals(fuel.cost) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium text-fg-muted">{{ t('dashboard.fuel.pricePerLiter') }}</dt>
          <dd class="font-semibold text-fg" data-testid="dashboard-fuel-price">
            <template v-if="fuel.avgPricePerLiter !== null">
              {{
                t('dashboard.fuel.perLiter', {
                  price: formatCurrency(fuel.avgPricePerLiter, { fractionDigits: 2 }),
                })
              }}
            </template>
            <template v-else>{{ t('dashboard.fuel.noPrice') }}</template>
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium text-fg-muted">{{ t('dashboard.fuel.fillUpsLabel') }}</dt>
          <dd class="font-semibold text-fg">
            {{ t('dashboard.fuel.fillUps', { count: String(fuel.fillUps) }) }}
          </dd>
        </div>
        <div v-if="fuel.topBoat">
          <dt class="text-xs font-medium text-fg-muted">{{ t('dashboard.fuel.topBoat') }}</dt>
          <dd class="truncate font-semibold text-fg">
            <Link
              :href="`/boats/${fuel.topBoat.boatId}`"
              data-testid="dashboard-fuel-top-boat"
              class="hover:underline"
            >
              {{ fuel.topBoat.boatName }}
            </Link>
            <span class="text-fg-muted">
              · {{ t('dashboard.fuel.liters', { liters: formatNumber(fuel.topBoat.liters) }) }}
            </span>
          </dd>
        </div>
      </dl>
    </template>
  </BaseCard>
</template>
