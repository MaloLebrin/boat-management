<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js'
import type { ChartOptions, TooltipItem } from 'chart.js'
import ReportChartCard from '~/components/reports/ReportChartCard.vue'
import { COST_CATEGORY_TOKENS, useChartPalette } from '~/composables/use_chart_palette'
import { useDateFormat } from '~/composables/use_date_format'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import { REPORT_COST_CATEGORIES, type FleetReportMonth } from '#shared/types/reporting'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const props = defineProps<{ monthly: FleetReportMonth[] }>()

const { t } = useT()
const { formatMonthYear } = useDateFormat()
const { formatCurrency, formatCurrencyNoDecimals } = useNumberFormat()
const colors = useChartPalette(COST_CATEGORY_TOKENS)

const hasData = computed(() => props.monthly.some((m) => m.costs.total > 0))

const chartData = computed(() => ({
  labels: props.monthly.map((m) => formatMonthYear(`${m.month}-01`)),
  datasets: REPORT_COST_CATEGORIES.map((category) => ({
    label: t(`budget.categories.${category}`),
    data: props.monthly.map((m) => m.costs[category]),
    backgroundColor: colors.value[category],
    borderRadius: 3,
  })),
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
    x: { stacked: true },
    y: {
      stacked: true,
      ticks: { callback: (value: number | string) => formatCurrencyNoDecimals(Number(value)) },
    },
  },
}))
</script>

<template>
  <ReportChartCard :title="t('reports.charts.costsTitle')" :has-data="hasData">
    <Bar :data="chartData" :options="chartOptions" />
  </ReportChartCard>
</template>
