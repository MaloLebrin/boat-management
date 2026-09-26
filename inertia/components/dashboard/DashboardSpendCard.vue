<script setup lang="ts">
import { computed } from 'vue'
import { Link } from '@adonisjs/inertia/vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseSkeleton from '~/components/base/BaseSkeleton.vue'
import DashboardSpendBar from '~/components/dashboard/DashboardSpendBar.vue'
import type { DashboardSpendSummary } from '#shared/types/dashboard'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'

/** `undefined` = prop différée pas encore arrivée (squelette). */
const props = defineProps<{ spend: DashboardSpendSummary | undefined }>()

const { t } = useT()
const { formatCurrencyNoDecimals } = useNumberFormat()

const CATEGORIES = ['maintenance', 'fuel', 'port', 'documents', 'equipment', 'entries'] as const

/** Postes triés du plus dépensier au moins, sans les postes à zéro. */
const bars = computed(() => {
  if (!props.spend) return []
  const totals = props.spend.totals
  return CATEGORIES.map((category) => ({ category, amount: totals[category] }))
    .filter((bar) => bar.amount > 0)
    .sort((a, b) => b.amount - a.amount)
})

// Même règle que BudgetCategoryCard : hausse en danger, baisse en succès.
const delta = computed(() => {
  const spend = props.spend
  if (!spend?.previousYearToDate) return null
  const previous = spend.previousYearToDate.total
  if (previous === 0) return null
  const pct = Math.abs(Math.round(((spend.totals.total - previous) / previous) * 100))
  return spend.totals.total >= previous
    ? { label: t('dashboard.spend.increase', { pct: String(pct) }), positive: false }
    : { label: t('dashboard.spend.decrease', { pct: String(pct) }), positive: true }
})
</script>

<template>
  <!-- Admins seulement (garde côté serveur : la prop n'existe pas pour les
       autres rôles) ; chargée en différé — ~18 agrégats SQL (#832). -->
  <BaseCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 class="text-sm font-semibold text-fg">
          {{ t('dashboard.spend.title', { year: String(spend?.year ?? '') }) }}
        </h2>
        <span class="text-xs font-medium text-fg-muted">{{ t('dashboard.spend.ytd') }}</span>
      </div>
    </template>

    <div v-if="spend === undefined" class="space-y-3" data-testid="dashboard-spend-skeleton">
      <BaseSkeleton height-class="h-8" width-class="w-1/2" />
      <BaseSkeleton v-for="i in 3" :key="i" height-class="h-6" />
    </div>

    <template v-else>
      <p
        class="font-display text-2xl font-bold tracking-tight text-fg"
        data-testid="dashboard-spend-total"
      >
        {{ formatCurrencyNoDecimals(spend.totals.total) }}
      </p>
      <p class="mt-1 text-xs text-fg-subtle" data-testid="dashboard-spend-delta">
        <template v-if="delta">
          <span :class="delta.positive ? 'text-success' : 'text-danger'" class="font-semibold">
            {{ delta.label }}
          </span>
          {{ t('dashboard.spend.vsSamePeriod', { year: String(spend.year - 1) }) }}
        </template>
        <template v-else>{{ t('dashboard.spend.noComparison') }}</template>
      </p>

      <p v-if="bars.length === 0" class="mt-4 text-sm text-fg-muted">
        {{ t('dashboard.spend.empty') }}
      </p>
      <div v-else class="mt-4 space-y-3">
        <DashboardSpendBar
          v-for="bar in bars"
          :key="bar.category"
          :category="bar.category"
          :amount="bar.amount"
          :total="spend.totals.total"
        />
      </div>
    </template>

    <template v-if="spend?.singleBoatId" #footer>
      <Link
        :href="`/boats/${spend.singleBoatId}/budget`"
        data-testid="dashboard-spend-link"
        class="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand hover:underline"
      >
        {{ t('dashboard.spend.viewBoatBudget') }}
        <span aria-hidden="true">&rarr;</span>
      </Link>
    </template>
  </BaseCard>
</template>
