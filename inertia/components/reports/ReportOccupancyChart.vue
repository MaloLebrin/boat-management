<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import type { ChartOptions } from 'chart.js'
import ReportChartCard from '~/components/reports/ReportChartCard.vue'
import { useChartPalette } from '~/composables/use_chart_palette'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { FleetReportMonth } from '#shared/types/reporting'

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend)

const props = defineProps<{ monthly: FleetReportMonth[] }>()

const { t } = useT()
const { formatMonthYear } = useDateFormat()
const colors = useChartPalette({ line: '--color-brand' })

const hasData = computed(() => props.monthly.some((m) => m.occupancyRate > 0))

const chartData = computed(() => ({
  labels: props.monthly.map((m) => formatMonthYear(`${m.month}-01`)),
  datasets: [
    {
      label: t('reports.charts.occupancy'),
      data: props.monthly.map((m) => m.occupancyRate),
      borderColor: colors.value.line,
      backgroundColor: colors.value.line,
      tension: 0.3,
    },
  ],
}))

const chartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { min: 0, max: 100, ticks: { callback: (value) => `${value} %` } } },
}))
</script>

<template>
  <ReportChartCard :title="t('reports.charts.occupancyTitle')" :has-data="hasData">
    <Line :data="chartData" :options="chartOptions" />
  </ReportChartCard>
</template>
