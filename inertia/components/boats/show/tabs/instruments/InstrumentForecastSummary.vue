<script setup lang="ts">
import { computed } from 'vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type { WeatherSummary } from '#shared/types/weather'

const props = defineProps<{ summary: WeatherSummary }>()

const { t } = useT()
const { formatNumber } = useNumberFormat()

const fmt = (value: number, digits: number) =>
  formatNumber(value, { maximumFractionDigits: digits, minimumFractionDigits: digits })

const tiles = computed(() => {
  const s = props.summary
  const pressure =
    s.minPressureHpa !== null && s.maxPressureHpa !== null
      ? `${fmt(s.minPressureHpa, 0)}–${fmt(s.maxPressureHpa, 0)} hPa`
      : null
  return [
    { key: 'wind', value: s.maxWindKn === null ? null : `${fmt(s.maxWindKn, 0)} kn` },
    { key: 'gust', value: s.maxGustKn === null ? null : `${fmt(s.maxGustKn, 0)} kn` },
    { key: 'wave', value: s.maxWaveM === null ? null : `${fmt(s.maxWaveM, 1)} m` },
    { key: 'pressure', value: pressure },
    { key: 'rain', value: s.totalRainMm === null ? null : `${fmt(s.totalRainMm, 1)} mm` },
  ].filter((tile) => tile.value !== null)
})
</script>

<template>
  <dl class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-testid="forecast-summary">
    <div
      v-for="tile in tiles"
      :key="tile.key"
      class="rounded-(--radius-card) border border-border bg-surface-elevated p-3"
    >
      <dt class="text-xs text-fg-muted">{{ t(`instruments.forecast.summary.${tile.key}`) }}</dt>
      <dd class="mt-1 text-lg font-semibold text-fg">{{ tile.value }}</dd>
    </div>
  </dl>
</template>
