<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import type {
  SimulatorBoatInput,
  SimulatorCostBreakdown,
  SimulatorBenchmarkEntry,
} from '../../../../shared/types/simulator'

interface Props {
  breakdown: SimulatorCostBreakdown
  input: SimulatorBoatInput
  benchmark?: SimulatorBenchmarkEntry | null
  showShare?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showShare: false,
})

const emit = defineEmits<{
  restart: []
  share: []
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

const maxCategoryCost = computed(() =>
  Math.max(...props.breakdown.categories.map((c) => c.maxCost))
)
</script>

<template>
  <div>
    <div class="mb-5 text-center">
      <h3 class="font-display text-2xl text-fg">{{ t('simulator.result_title') }}</h3>
      <p class="mt-1 text-xs text-fg-subtle">{{ t('simulator.result_subtitle') }}</p>
    </div>

    <!-- Category breakdown with proportional bars -->
    <div class="space-y-3.5">
      <div v-for="cat in breakdown.categories" :key="cat.key">
        <div class="mb-1.5 flex items-baseline justify-between">
          <span class="text-sm font-medium text-fg">{{
            t(categoryLabels[cat.key] || cat.key)
          }}</span>
          <span class="text-xs text-fg-muted">
            {{ formatCurrency(cat.minCost) }} – {{ formatCurrency(cat.maxCost) }}
          </span>
        </div>
        <div class="h-1.5 overflow-hidden rounded-full bg-bone">
          <div
            class="h-full rounded-full bg-coral-400 transition-all duration-700"
            :style="{ width: `${Math.round((cat.maxCost / maxCategoryCost) * 100)}%` }"
          />
        </div>
      </div>
    </div>

    <!-- Total -->
    <div class="mt-6 rounded-2xl bg-navy-900 px-5 py-6 text-center">
      <p class="text-xs font-semibold uppercase tracking-wider text-white/50">
        {{ t('simulator.result_total') }}
      </p>
      <p class="mt-2 font-display text-4xl text-white">
        {{ formatCurrency(breakdown.totalMin) }}
      </p>
      <p class="mt-1 text-sm text-white/60">
        {{
          t('simulator.result_range', {
            min: formatCurrency(breakdown.totalMin),
            max: formatCurrency(breakdown.totalMax),
          })
        }}
      </p>
    </div>

    <!-- Benchmark -->
    <div
      v-if="props.benchmark"
      class="mt-3 rounded-xl border border-bone bg-cream px-4 py-3 text-center"
    >
      <p class="text-xs text-fg-subtle">
        {{ t('simulator.benchmark_label', { count: String(props.benchmark.count) }) }}
      </p>
      <p class="mt-1 text-sm font-semibold text-fg">
        {{ formatCurrency(props.benchmark.avgMin) }} – {{ formatCurrency(props.benchmark.avgMax) }}
      </p>
    </div>

    <button
      type="button"
      class="mt-4 w-full text-sm text-fg-subtle underline underline-offset-2 transition-colors hover:text-fg"
      @click="emit('restart')"
    >
      {{ t('simulator.recalculate') }}
    </button>

    <button
      v-if="props.showShare"
      type="button"
      class="mt-2 w-full text-sm text-fg-subtle underline underline-offset-2 transition-colors hover:text-fg"
      @click="emit('share')"
    >
      {{ t('simulator.share_button') }}
    </button>
  </div>
</template>
