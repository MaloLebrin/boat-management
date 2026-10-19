<script setup lang="ts">
import { computed } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { InstrumentReading } from '~/lib/signalk/display'

const props = defineProps<{ readings: InstrumentReading[] }>()

const { t } = useT()
const { formatDateTime } = useDateFormat()

interface Alarm {
  path: string
  instance: string
  state: string
  message: string | null
  at: number
}

/** Les alarmes dont l'état n'est pas « normal », les plus graves d'abord. */
const SEVERITY = ['emergency', 'alarm', 'alert', 'warn']

const alarms = computed<Alarm[]>(() =>
  props.readings
    .filter((reading) => reading.category === 'notifications')
    .flatMap((reading) => {
      const json = reading.valueJson
      if (json === null || typeof json !== 'object' || Array.isArray(json)) return []
      const state = typeof json.state === 'string' ? json.state : 'normal'
      if (state === 'normal' || state === 'nominal') return []
      return [
        {
          path: reading.path,
          instance: reading.instance,
          state,
          message: typeof json.message === 'string' ? json.message : null,
          at: reading.at,
        },
      ]
    })
    .sort((a, b) => SEVERITY.indexOf(a.state) - SEVERITY.indexOf(b.state))
)

function variant(state: string): 'danger' | 'warning' | 'info' {
  if (state === 'emergency' || state === 'alarm') return 'danger'
  if (state === 'alert' || state === 'warn') return 'warning'
  return 'info'
}
</script>

<template>
  <section data-testid="instrument-alarms">
    <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">
      {{ t('instruments.category.notifications') }}
    </h3>
    <p v-if="alarms.length === 0" class="text-sm text-fg-muted">
      {{ t('instruments.alarms.none') }}
    </p>
    <ul v-else class="space-y-2">
      <li
        v-for="alarm in alarms"
        :key="alarm.path"
        class="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-elevated p-3"
      >
        <BaseBadge :variant="variant(alarm.state)">
          {{ t(`instruments.alarms.state.${alarm.state}`) }}
        </BaseBadge>
        <span class="min-w-0 flex-1 text-sm text-fg">
          {{ alarm.message ?? alarm.instance }}
        </span>
        <span class="text-xs text-fg-subtle">{{ formatDateTime(new Date(alarm.at)) }}</span>
      </li>
    </ul>
  </section>
</template>
