<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseCheckbox from '~/components/base/BaseCheckbox.vue'
import BaseSegmentedControl from '~/components/base/BaseSegmentedControl.vue'
import InstrumentLineChart from '~/components/boats/show/tabs/instruments/InstrumentLineChart.vue'
import { useT } from '~/composables/use_t'
import { fractionDigits, pathLabelSlug } from '~/lib/signalk/display'
import { toDisplayUnit } from '~/lib/signalk/units'
import {
  TELEMETRY_SERIES_DEFAULT_RANGE,
  TELEMETRY_SERIES_MAX_PATHS,
  telemetryPathSpec,
} from '#shared/constants/instruments'
import type { InstrumentSeries, TelemetrySeriesRange } from '#shared/types/instruments'

const props = defineProps<{
  /** Chemins numériques déjà connus du bateau : on ne propose que ceux-là. */
  paths: string[]
  /** Dernière série chargée (`instrumentSeries`), absente tant que rien n'est demandé. */
  series?: InstrumentSeries
}>()

const { t } = useT()

const RANGES: TelemetrySeriesRange[] = ['1h', '24h', '7d']
const range = ref<TelemetrySeriesRange>(props.series?.range ?? TELEMETRY_SERIES_DEFAULT_RANGE)
const selected = ref<string[]>(Object.keys(props.series?.series ?? {}))
const loading = ref(false)

const rangeOptions = RANGES.map((value) => ({
  value,
  label: t(`instruments.history.range.${value}`),
}))

function describe(path: string) {
  const spec = telemetryPathSpec(path)
  if (!spec) return null
  const segments = path.split('.')
  const patternSegments = spec.pattern.split('.')
  const instance = segments
    .filter((_, index) => patternSegments[index]?.startsWith('<'))
    .join(' · ')
  const label = t(`instruments.path.${pathLabelSlug(spec.pattern)}`)
  return { spec, label: instance ? `${label} (${instance})` : label }
}

const choices = computed(() =>
  props.paths.flatMap((path) => {
    const info = describe(path)
    return info?.spec.valueKind === 'number' ? [{ path, label: info.label }] : []
  })
)

function load() {
  if (selected.value.length === 0) return
  loading.value = true
  router.reload({
    only: ['instrumentSeries'],
    data: { range: range.value, paths: selected.value },
    onFinish: () => (loading.value = false),
  })
}

function toggle(path: string, on: boolean) {
  if (on && selected.value.length >= TELEMETRY_SERIES_MAX_PATHS) return
  selected.value = on ? [...selected.value, path] : selected.value.filter((p) => p !== path)
  load()
}

watch(range, load)

const charts = computed(() =>
  selected.value.flatMap((path) => {
    const info = describe(path)
    const points = props.series?.series[path]
    if (!info) return []
    const unit = info.spec.displayUnit
    return [
      {
        path,
        label: info.label,
        unit,
        digits: fractionDigits(unit),
        points: (points ?? []).map(([at, value]): [string, number] => [
          at,
          toDisplayUnit(unit, value),
        ]),
      },
    ]
  })
)
</script>

<template>
  <section class="space-y-4" data-testid="instrument-history">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h3 class="text-sm font-semibold uppercase tracking-wide text-fg-muted">
        {{ t('instruments.history.title') }}
      </h3>
      <BaseSegmentedControl v-model="range" :options="rangeOptions" />
    </div>

    <p v-if="choices.length === 0" class="text-sm text-fg-muted">
      {{ t('instruments.history.noPaths') }}
    </p>
    <template v-else>
      <p class="text-xs text-fg-subtle">
        {{ t('instruments.history.pick', { max: String(TELEMETRY_SERIES_MAX_PATHS) }) }}
      </p>
      <div class="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        <BaseCheckbox
          v-for="choice in choices"
          :key="choice.path"
          :label="choice.label"
          :model-value="selected.includes(choice.path)"
          @update:model-value="toggle(choice.path, $event)"
        />
      </div>

      <p v-if="selected.length === 0" class="text-sm text-fg-muted">
        {{ t('instruments.history.selectOne') }}
      </p>
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2" :aria-busy="loading">
        <div
          v-for="chart in charts"
          :key="chart.path"
          class="rounded-(--radius-card) border border-border bg-surface-elevated p-4"
          :data-testid="`history-${chart.path}`"
        >
          <p class="mb-2 text-sm font-semibold text-fg">
            {{ chart.label
            }}<span v-if="chart.unit" class="text-fg-subtle"> · {{ chart.unit }}</span>
          </p>
          <InstrumentLineChart
            v-if="chart.points.length > 0"
            :points="chart.points"
            :label="chart.label"
            :unit="chart.unit"
            :fraction-digits="chart.digits"
            :show-day="range === '7d'"
          />
          <p v-else class="py-10 text-center text-sm text-fg-subtle">
            {{ t(loading ? 'instruments.history.loading' : 'instruments.history.empty') }}
          </p>
        </div>
      </div>
    </template>
  </section>
</template>
