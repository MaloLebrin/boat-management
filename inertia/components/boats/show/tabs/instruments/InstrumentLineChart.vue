<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import type { ChartOptions, TooltipItem } from 'chart.js'
import { useChartPalette } from '~/composables/use_chart_palette'
import { useDateFormat } from '~/composables/use_date_format'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

const props = defineProps<{
  /** `[début du seau ISO, valeur en unité d'affichage]`. */
  points: Array<[string, number]>
  label: string
  unit: string | null
  /** `true` au-delà de 24 h : l'axe porte alors la date et non l'heure seule. */
  showDay: boolean
  fractionDigits: number
}>()

const { formatTime, formatDayMonth, formatDateTime } = useDateFormat()
const colors = useChartPalette({
  line: '--color-brand',
  grid: '--color-border',
  ink: '--color-fg-muted',
})

const labels = computed(() =>
  props.points.map(([at]) => (props.showDay ? formatDayMonth(at) : formatTime(at)))
)

const chartData = computed(() => ({
  labels: labels.value,
  datasets: [
    {
      label: props.label,
      data: props.points.map(([, value]) => value),
      borderColor: colors.value.line,
      backgroundColor: colors.value.line,
      borderWidth: 2,
      pointRadius: 0,
      pointHitRadius: 8,
      tension: 0.25,
    },
  ],
}))

const suffix = computed(() => (props.unit ? ` ${props.unit}` : ''))

const chartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        title: (items: TooltipItem<'line'>[]) => {
          const point = props.points[items[0]?.dataIndex ?? 0]
          return point ? formatDateTime(point[0]) : ''
        },
        label: (ctx: TooltipItem<'line'>) =>
          `${(ctx.parsed.y ?? 0).toFixed(props.fractionDigits)}${suffix.value}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: colors.value.ink, maxTicksLimit: 6, maxRotation: 0 },
    },
    y: {
      grid: { color: colors.value.grid },
      ticks: { color: colors.value.ink, callback: (value) => `${value}${suffix.value}` },
    },
  },
}))
</script>

<template>
  <div class="h-48" data-testid="instrument-line-chart">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>
