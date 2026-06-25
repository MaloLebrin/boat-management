<script setup lang="ts">
import { computed } from 'vue'
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
import { useCurrencyFormat } from '~/composables/use_currency_format'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  category: 'maintenance' | 'fuel' | 'documents' | 'port' | 'equipment' | 'entries' | 'total'
  amount: number
  previousAmount: number | null
  previousYear: number | null
  unavailable?: boolean
  helpText?: string
}>()

const { t } = useT()
const { formatCurrency } = useCurrencyFormat()

const formatted = computed(() => (props.unavailable ? '—' : formatCurrency(props.amount)))

const delta = computed(() => {
  if (props.unavailable || props.previousAmount === null || props.previousYear === null) return null
  if (props.previousAmount === 0)
    return props.amount > 0 ? { label: t('budget.cards.newThisYear'), positive: true } : null
  const pct = ((props.amount - props.previousAmount) / props.previousAmount) * 100
  const rounded = Math.abs(Math.round(pct))
  if (pct > 0)
    return { label: t('budget.cards.increase', { pct: String(rounded) }), positive: false }
  return { label: t('budget.cards.decrease', { pct: String(rounded) }), positive: true }
})

const vsLabel = computed(() =>
  props.previousYear
    ? t('budget.cards.vsLastYear', { year: String(props.previousYear) })
    : t('budget.cards.noComparison')
)

const COLORS: Record<string, string> = {
  maintenance: 'text-amber-600 dark:text-amber-400',
  fuel: 'text-blue-600 dark:text-blue-400',
  documents: 'text-purple-600 dark:text-purple-400',
  port: 'text-teal-600 dark:text-teal-400',
  equipment: 'text-green-600 dark:text-green-400',
  entries: 'text-orange-600 dark:text-orange-400',
  total: 'text-fg',
}
</script>

<template>
  <div
    class="rounded-(--radius-card) border border-border bg-surface-elevated p-5 shadow-(--shadow-xs)"
  >
    <div class="flex items-center justify-between gap-1">
      <p class="text-sm font-semibold text-fg-muted">{{ t(`budget.categories.${category}`) }}</p>
      <button
        v-if="helpText"
        type="button"
        :title="helpText"
        :aria-label="helpText"
        class="shrink-0 text-fg-subtle hover:text-fg-muted transition-colors"
      >
        <QuestionMarkCircleIcon class="h-4 w-4" />
      </button>
    </div>
    <p class="mt-3 font-display text-2xl font-bold tracking-tight" :class="COLORS[category]">
      {{ formatted }}
    </p>
    <p v-if="unavailable" class="mt-1 text-xs text-fg-subtle italic">
      {{ t('budget.portUnavailable') }}
    </p>
    <template v-else-if="previousAmount !== null && previousYear !== null">
      <p class="mt-1 text-xs text-fg-subtle">
        {{ vsLabel }}
        <span
          v-if="delta"
          :class="
            delta.positive
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          "
          class="ml-1 font-semibold"
          >{{ delta.label }}</span
        >
      </p>
    </template>
    <p v-else class="mt-1 text-xs text-fg-subtle">{{ t('budget.cards.noComparison') }}</p>
  </div>
</template>
