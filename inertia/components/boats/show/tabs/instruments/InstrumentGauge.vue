<script setup lang="ts">
import { computed } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import { fractionDigits, isStale, type InstrumentReading } from '~/lib/signalk/display'

const props = defineProps<{ reading: InstrumentReading; now: number }>()

const { t } = useT()
const { formatNumber } = useNumberFormat()
const { formatDateTime } = useDateFormat()

const stale = computed(() => isStale(props.reading, props.now))

/** `{ latitude, longitude }` → « 43,2965° N, 5,3698° E ». */
const position = computed(() => {
  const json = props.reading.valueJson
  if (json === null || typeof json !== 'object' || Array.isArray(json)) return null
  const { latitude, longitude } = json
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null
  const fix = (value: number, positive: string, negative: string) =>
    `${formatNumber(Math.abs(value), { maximumFractionDigits: 4 })}° ${value >= 0 ? positive : negative}`
  return `${fix(latitude, 'N', 'S')}, ${fix(longitude, 'E', 'W')}`
})

const formatted = computed(() => {
  if (position.value) return position.value
  if (props.reading.value === null) return '—'
  const digits = fractionDigits(props.reading.displayUnit)
  return formatNumber(props.reading.value, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
})

const unit = computed(() => (position.value ? '' : (props.reading.displayUnit ?? '')))
</script>

<template>
  <div
    class="rounded-lg border border-border bg-surface-elevated p-4"
    data-testid="instrument-gauge"
    :data-path="reading.path"
  >
    <div class="flex items-start justify-between gap-2">
      <p class="min-w-0 text-sm font-medium text-fg">
        {{ t(reading.labelKey) }}
        <span v-if="reading.instance" class="text-fg-muted">· {{ reading.instance }}</span>
      </p>
      <BaseBadge v-if="stale" variant="warning">{{ t('instruments.gauge.stale') }}</BaseBadge>
    </div>
    <p class="mt-2 text-2xl font-semibold tabular-nums text-fg">
      {{ formatted }}
      <span v-if="unit" class="text-sm font-normal text-fg-muted">{{ unit }}</span>
    </p>
    <p class="mt-1 text-xs text-fg-subtle">
      {{
        reading.live
          ? t('instruments.gauge.live')
          : t('instruments.gauge.lastKnown', { date: formatDateTime(new Date(reading.at)) })
      }}
    </p>
  </div>
</template>
