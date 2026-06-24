<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
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
import { useT } from '~/composables/use_t'
import type { BudgetMonthlyData } from '../../../types/budget'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps<{
  monthly: BudgetMonthlyData[]
}>()

const { t } = useT()

const isDark = ref(false)

onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark')
  const observer = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark')
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
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
          `${ctx.dataset.label}: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(ctx.parsed.y)}`,
      },
    },
  },
  scales: {
    x: { stacked: true },
    y: {
      stacked: true,
      ticks: {
        callback: (value: number | string) =>
          new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
          }).format(Number(value)),
      },
    },
  },
}))

// Trick to force chart re-render on dark mode toggle
const chartKey = ref(0)
watch(isDark, () => {
  chartKey.value++
})
</script>

<template>
  <div
    class="rounded-(--radius-card) border border-border bg-surface-elevated p-5 shadow-(--shadow-xs)"
  >
    <p class="text-sm font-semibold text-fg-muted mb-4">{{ t('budget.chart.title') }}</p>
    <div v-if="hasData" class="h-72">
      <Bar :key="chartKey" :data="chartData" :options="chartOptions" />
    </div>
    <p v-else class="text-sm text-fg-subtle text-center py-10">{{ t('budget.chart.noData') }}</p>
  </div>
</template>
