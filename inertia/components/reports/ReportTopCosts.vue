<script setup lang="ts">
import { computed } from 'vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import { REPORT_COST_CATEGORIES, type ReportCostBreakdown } from '#shared/types/reporting'

const props = defineProps<{ costs: ReportCostBreakdown }>()

const { t } = useT()
const { formatCurrency } = useNumberFormat()

const rows = computed(() =>
  REPORT_COST_CATEGORIES.map((category) => ({
    category,
    amount: props.costs[category],
    share:
      props.costs.total > 0 ? Math.round((100 * props.costs[category]) / props.costs.total) : 0,
  }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount)
)
</script>

<template>
  <section
    class="rounded-(--radius-card) border border-border bg-surface-elevated p-5 shadow-(--shadow-xs)"
  >
    <h2 class="mb-4 text-sm font-semibold text-fg-muted">
      {{ t('reports.charts.topCostsTitle') }}
    </h2>
    <ul v-if="rows.length" class="space-y-3" data-test="top-costs">
      <li v-for="row in rows" :key="row.category">
        <div class="flex items-baseline justify-between gap-3 text-sm">
          <span class="text-fg">{{ t(`budget.categories.${row.category}`) }}</span>
          <span class="font-semibold text-fg">{{ formatCurrency(row.amount) }}</span>
        </div>
        <div class="mt-1 h-1.5 rounded-full bg-surface-muted" aria-hidden="true">
          <div class="h-1.5 rounded-full bg-brand" :style="{ width: `${row.share}%` }" />
        </div>
      </li>
    </ul>
    <p v-else class="py-10 text-center text-sm text-fg-subtle">{{ t('reports.charts.noData') }}</p>
  </section>
</template>
