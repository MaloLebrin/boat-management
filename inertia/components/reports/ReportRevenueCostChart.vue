<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js'
import type { ChartOptions, TooltipItem } from 'chart.js'
import ReportChartCard from '~/components/reports/ReportChartCard.vue'
import { useChartPalette } from '~/composables/use_chart_palette'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type { FleetReportBoatRow } from '#shared/types/reporting'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const props = defineProps<{ boats: FleetReportBoatRow[] }>()

const { t } = useT()
const { formatCurrency, formatCurrencyNoDecimals } = useNumberFormat()
const colors = useChartPalette({ revenue: '--color-success', costs: '--color-danger' })

const hasData = computed(() => props.boats.some((b) => b.rentalRevenue > 0 || b.costs.total > 0))

const chartData = computed(() => ({
  labels: props.boats.map((b) => b.boatName),
  datasets: [
    {
      label: t('reports.charts.revenue'),
      data: props.boats.map((b) => b.rentalRevenue),
      backgroundColor: colors.value.revenue,
      borderRadius: 3,
    },
    {
      label: t('reports.charts.costs'),
      data: props.boats.map((b) => b.costs.total),
      backgroundColor: colors.value.costs,
      borderRadius: 3,
    },
  ],
}))

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const },
    tooltip: {
      callbacks: {
        label: (ctx: TooltipItem<'bar'>) =>
          `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y ?? 0)}`,
      },
    },
  },
  scales: {
    y: {
      ticks: { callback: (value: number | string) => formatCurrencyNoDecimals(Number(value)) },
    },
  },
}))
</script>

<template>
  <ReportChartCard :title="t('reports.charts.revenueVsCostsTitle')" :has-data="hasData">
    <Bar :data="chartData" :options="chartOptions" />
  </ReportChartCard>
</template>
