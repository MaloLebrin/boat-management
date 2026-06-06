<script setup lang="ts">
import { useT } from '~/composables/use_t'
import type { SimulatorBoatInput, SimulatorCostBreakdown } from '../../../../shared/types/simulator'

interface Props {
  breakdown: SimulatorCostBreakdown
  input: SimulatorBoatInput
}

defineProps<Props>()

const emit = defineEmits<{
  restart: []
}>()

const { t } = useT()

const categoryLabels: Record<string, string> = {
  hull: 'simulator.cat_hull',
  engine: 'simulator.cat_engine',
  safety: 'simulator.cat_safety',
  electrical: 'simulator.cat_electrical',
  mooring: 'simulator.cat_mooring',
  rigging: 'simulator.cat_rigging',
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
</script>

<template>
  <div class="rounded-2xl border border-bone bg-paper p-6 shadow-sm lg:p-8">
    <div class="mb-6 text-center">
      <h3 class="font-display text-2xl text-fg">
        {{ t('simulator.result_title') }}
      </h3>
      <p class="mt-1 text-sm text-fg-muted">
        {{ t('simulator.result_subtitle') }}
      </p>
    </div>

    <!-- Cost breakdown table -->
    <div class="mb-6 overflow-hidden rounded-xl border border-bone">
      <table class="w-full">
        <tbody class="divide-y divide-bone">
          <tr v-for="cat in breakdown.categories" :key="cat.key" class="bg-cream">
            <td class="px-4 py-3 text-sm font-medium text-fg">
              {{ t(categoryLabels[cat.key] || cat.key) }}
            </td>
            <td class="px-4 py-3 text-right text-sm text-fg-muted">
              {{ formatCurrency(cat.minCost) }} - {{ formatCurrency(cat.maxCost) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Total -->
    <div class="rounded-xl bg-navy-900 p-5 text-center">
      <p class="text-sm font-medium text-white/70">
        {{ t('simulator.result_total') }}
      </p>
      <p class="mt-1 font-display text-3xl text-white">
        {{ formatCurrency(breakdown.totalMin) }} - {{ formatCurrency(breakdown.totalMax) }}
      </p>
      <p class="mt-1 text-xs text-white/50">
        {{ t('simulator.result_range', { min: formatCurrency(breakdown.totalMin), max: formatCurrency(breakdown.totalMax) }) }}
      </p>
    </div>

    <!-- Restart button -->
    <button
      type="button"
      class="mt-6 w-full rounded-xl border-2 border-bone bg-paper px-6 py-4 text-base font-semibold text-fg transition-colors hover:border-fg-subtle"
      @click="emit('restart')"
    >
      {{ t('simulator.recalculate') }}
    </button>
  </div>
</template>
