<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  category: 'maintenance' | 'fuel' | 'documents' | 'total'
  amount: number
  previousAmount: number | null
  previousYear: number | null
  unavailable?: boolean
}>()

const { t } = useT()

const formatted = computed(() =>
  props.unavailable
    ? '—'
    : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(props.amount)
)

const delta = computed(() => {
  if (props.unavailable || props.previousAmount === null || props.previousYear === null) return null
  if (props.previousAmount === 0) return null
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
  total: 'text-fg',
}
</script>

<template>
  <div
    class="rounded-(--radius-card) border border-border bg-surface-elevated p-5 shadow-(--shadow-xs)"
  >
    <p class="text-sm font-semibold text-fg-muted">{{ t(`budget.categories.${category}`) }}</p>
    <p class="mt-3 font-display text-2xl font-bold tracking-tight" :class="COLORS[category]">
      {{ formatted }}
    </p>
    <p v-if="unavailable" class="mt-1 text-xs text-fg-subtle italic">
      {{ t('budget.portUnavailable') }}
    </p>
    <template v-else-if="previousAmount !== null">
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
