<script setup lang="ts">
import InstrumentLineChart from '~/components/boats/show/tabs/instruments/InstrumentLineChart.vue'
import { useT } from '~/composables/use_t'
import type { WeatherMetricSeries } from '#shared/types/weather'

defineProps<{ series: WeatherMetricSeries[]; showDay: boolean }>()

const { t } = useT()
</script>

<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <div
      v-for="metric in series"
      :key="metric.key"
      class="rounded-(--radius-card) border border-border bg-surface-elevated p-4"
      :data-testid="`forecast-${metric.key}`"
    >
      <p class="mb-2 text-sm font-semibold text-fg">
        {{ t(`instruments.forecast.metric.${metric.key}`)
        }}<span class="text-fg-subtle"> · {{ metric.unit }}</span>
      </p>
      <InstrumentLineChart
        :points="metric.points"
        :label="t(`instruments.forecast.metric.${metric.key}`)"
        :unit="metric.unit"
        :fraction-digits="metric.digits"
        :show-day="showDay"
      />
    </div>
  </div>
</template>
