<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseSegmentedControl from '~/components/base/BaseSegmentedControl.vue'
import InstrumentForecastCharts from '~/components/boats/show/tabs/instruments/InstrumentForecastCharts.vue'
import InstrumentForecastSummary from '~/components/boats/show/tabs/instruments/InstrumentForecastSummary.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import { buildMetricSeries, summarize, windowPoints } from '~/lib/signalk/weather'
import { WEATHER_DEFAULT_RANGE, WEATHER_RANGES } from '#shared/constants/weather'
import type {
  WeatherErrorKey,
  WeatherForecastSnapshot,
  WeatherRangeHours,
} from '#shared/types/weather'

const props = defineProps<{
  snapshot: WeatherForecastSnapshot | null
  error: WeatherErrorKey | null
  loading: boolean
  stale: boolean
  now: number
}>()

defineEmits<{ refresh: [] }>()

const { t } = useT()
const { formatDateTime } = useDateFormat()

const range = ref<WeatherRangeHours>(WEATHER_DEFAULT_RANGE)
const rangeOptions = WEATHER_RANGES.map((hours) => ({
  value: hours,
  label: t('instruments.forecast.range', { hours: String(hours) }),
}))

const points = computed(() =>
  props.snapshot ? windowPoints(props.snapshot, range.value, props.now) : []
)
const series = computed(() => buildMetricSeries(points.value))
const summary = computed(() => summarize(points.value))
</script>

<template>
  <section class="space-y-4" data-testid="instrument-forecast">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h3 class="text-sm font-semibold uppercase tracking-wide text-fg-muted">
        {{ t('instruments.forecast.title') }}
      </h3>
      <div class="flex items-center gap-3">
        <BaseSegmentedControl v-model="range" :options="rangeOptions" />
        <BaseButton
          type="button"
          variant="secondary"
          size="sm"
          :disabled="loading"
          @click="$emit('refresh')"
        >
          {{ t(loading ? 'instruments.forecast.loading' : 'instruments.forecast.refresh') }}
        </BaseButton>
      </div>
    </div>

    <BaseAlert v-if="error" variant="warning" data-testid="forecast-error">
      {{ t(`instruments.forecast.error.${error}`) }}
    </BaseAlert>
    <BaseAlert v-if="snapshot && stale" variant="warning" data-testid="forecast-stale">
      {{ t('instruments.forecast.stale', { date: formatDateTime(new Date(snapshot.fetchedAt)) }) }}
    </BaseAlert>
    <p v-if="snapshot && !stale" class="text-xs text-fg-subtle" data-testid="forecast-source">
      {{
        t('instruments.forecast.source', {
          provider: snapshot.providerName,
          date: formatDateTime(new Date(snapshot.fetchedAt)),
        })
      }}
    </p>

    <template v-if="snapshot">
      <p v-if="series.length === 0" class="text-sm text-fg-muted">
        {{ t('instruments.forecast.empty') }}
      </p>
      <template v-else>
        <InstrumentForecastSummary :summary="summary" />
        <InstrumentForecastCharts :series="series" :show-day="range > 24" />
      </template>
    </template>
    <p v-else-if="!error && !loading" class="text-sm text-fg-muted">
      {{ t('instruments.forecast.none') }}
    </p>
  </section>
</template>
