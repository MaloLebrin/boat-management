<script setup lang="ts">
import { computed } from 'vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'

type Category = 'maintenance' | 'fuel' | 'port' | 'documents' | 'equipment' | 'entries'

const props = defineProps<{ category: Category; amount: number; total: number }>()

const { t } = useT()
const { formatCurrencyNoDecimals } = useNumberFormat()

// Tons moyens des palettes de marque : autorisés en aplat, ils basculent en
// thème sombre (mêmes couleurs que BudgetCategoryCard / BudgetBarChart).
const BAR: Record<Category, string> = {
  maintenance: 'bg-amber-500',
  fuel: 'bg-sky-500',
  port: 'bg-lilac-500',
  documents: 'bg-violet-500',
  equipment: 'bg-mint-500',
  entries: 'bg-peach-500',
}

const percent = computed(() =>
  props.total > 0 ? Math.round((props.amount / props.total) * 100) : 0
)
</script>

<template>
  <div data-testid="dashboard-spend-bar" :data-category="category" :data-percent="percent">
    <div class="flex items-baseline justify-between gap-3 text-xs">
      <span class="truncate font-medium text-fg-muted">{{
        t(`budget.categories.${category}`)
      }}</span>
      <span class="shrink-0 font-semibold text-fg">{{ formatCurrencyNoDecimals(amount) }}</span>
    </div>
    <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
      <div class="h-full rounded-full" :class="BAR[category]" :style="{ width: `${percent}%` }" />
    </div>
  </div>
</template>
