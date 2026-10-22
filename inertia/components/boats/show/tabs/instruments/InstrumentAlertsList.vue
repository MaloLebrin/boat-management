<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import { toDisplayUnit } from '~/lib/signalk/units'
import { instrumentAlertLabel } from '~/utils/instrument_alert_label'
import type { DisplayInstrumentAlert } from '~/utils/instrument_alerts'
import { telemetryPathSpec } from '#shared/constants/instruments'

defineProps<{ alerts: DisplayInstrumentAlert[] }>()

const { t } = useT()
const { formatDateTime } = useDateFormat()

function valueText(alert: DisplayInstrumentAlert): string | null {
  if (alert.value === null) return null
  const unit = telemetryPathSpec(alert.path)?.displayUnit ?? null
  const shown = Math.round(toDisplayUnit(unit, alert.value) * 10) / 10
  return t('instruments.alerts.lastValue', { value: unit ? `${shown} ${unit}` : String(shown) })
}
</script>

<template>
  <section data-testid="instrument-alerts">
    <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">
      {{ t('instruments.alerts.title') }}
    </h3>
    <p v-if="alerts.length === 0" class="text-sm text-fg-muted">
      {{ t('instruments.alerts.none') }}
    </p>
    <ul v-else class="space-y-2">
      <li
        v-for="alert in alerts"
        :key="alert.key"
        data-testid="instrument-alert"
        :data-severity="alert.severity"
        class="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-elevated p-3"
      >
        <BaseBadge :variant="alert.severity === 'critical' ? 'danger' : 'warning'">
          {{ t(`instruments.alerts.severity.${alert.severity}`) }}
        </BaseBadge>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-fg">
            {{ alert.message ?? instrumentAlertLabel(t, alert.ruleKey, alert.path) }}
          </p>
          <p v-if="valueText(alert)" class="text-xs text-fg-muted">{{ valueText(alert) }}</p>
        </div>
        <BaseBadge v-if="alert.local" variant="info">{{ t('instruments.alerts.local') }}</BaseBadge>
        <span class="text-xs text-fg-subtle">
          {{ t('instruments.alerts.openedAt', { date: formatDateTime(new Date(alert.openedAt)) }) }}
        </span>
      </li>
    </ul>
  </section>
</template>
