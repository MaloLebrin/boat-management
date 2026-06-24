<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js'
import { useCurrencyFormat } from '~/composables/use_currency_format'
import { useT } from '~/composables/use_t'
import type { BudgetMonthlyData } from '~/types/budget'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps<{
  monthly: BudgetMonthlyData[]
}>()

const { t } = useT()
const { formatCurrency, formatCurrencyNoDecimals } = useCurrencyFormat()

const isDark = ref(false)
let darkObserver: MutationObserver | null = null

onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark')
  darkObserver = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark')
  })
  darkObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => {
  darkObserver?.disconnect()
})

const labels = computed(() => props.monthly.map((m) => t(`budget.months.${String(m.month)}`)))

const hasData = computed(() => props.monthly.some((m) => m.total > 0))

const chartData = computed(() => ({
  labels: labels.value,
  datasets: [
    {
      label: t('budget.categories.maintenance'),
      data: props.monthly.map((m) => m.maintenance),
      backgroundColor: isDark.value ? 'rgba(251,191,36,0.8)' : 'rgba(217,119,6,0.8)',
      borderRadius: 3,
    },
    {
      label: t('budget.categories.fuel'),
      data: props.monthly.map((m) => m.fuel),
      backgroundColor: isDark.value ? 'rgba(96,165,250,0.8)' : 'rgba(37,99,235,0.8)',
      borderRadius: 3,
    },
    {
      label: t('budget.categories.documents'),
      data: props.monthly.map((m) => m.documents),
      backgroundColor: isDark.value ? 'rgba(192,132,252,0.8)' : 'rgba(126,34,206,0.8)',
      borderRadius: 3,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) =>
          `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
      },
    },
  },
  scales: {
    x: { stacked: true },
    y: {
      stacked: true,
      ticks: {
        callback: (value: number | string) => formatCurrencyNoDecimals(Number(value)),
      },
    },
  },
}))
</script>

<template>
  <div
    class="rounded-(--radius-card) border border-border bg-surface-elevated p-5 shadow-(--shadow-xs)"
  >
    <p class="text-sm font-semibold text-fg-muted mb-4">{{ t('budget.chart.title') }}</p>
    <div v-if="hasData" class="h-72">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
    <p v-else class="text-sm text-fg-subtle text-center py-10">{{ t('budget.chart.noData') }}</p>
  </div>
</template>
