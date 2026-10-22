<script setup lang="ts">
import { router, useForm } from '@inertiajs/vue3'
import { computed } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseToggle from '~/components/base/BaseToggle.vue'
import { useT } from '~/composables/use_t'
import { toDisplayUnit } from '~/lib/signalk/units'
import { telemetryPathSpec } from '#shared/constants/instruments'
import { INSTRUMENT_ALERT_MAX_RULES_PER_BOAT } from '#shared/constants/instrument_alerts'
import type { InstrumentAlertRuleRow } from '#shared/types/instruments'

const props = defineProps<{
  boatId: number
  rules: InstrumentAlertRuleRow[]
  /** Instruments numériques qui ont déjà remonté une valeur : les seuls sur lesquels poser une règle. */
  paths: Array<{ label: string; value: string }>
}>()

const { t } = useT()

const form = useForm({
  path: '',
  operator: 'lt',
  threshold: '',
  hysteresis: '',
  severity: 'warning',
})

const unit = computed(() => telemetryPathSpec(form.path)?.displayUnit ?? '')
const limitReached = computed(() => props.rules.length >= INSTRUMENT_ALERT_MAX_RULES_PER_BOAT)

const operatorOptions = computed(() =>
  (['lt', 'gt'] as const).map((value) => ({
    value,
    label: t(`instruments.alerts.operator.${value}`),
  }))
)
const severityOptions = computed(() =>
  (['warning', 'critical'] as const).map((value) => ({
    value,
    label: t(`instruments.alerts.severity.${value}`),
  }))
)

const round = (value: number) => Math.round(value * 10_000) / 10_000

/** Seuil et marge d'une règle, remis dans l'unité d'affichage de son chemin. */
function displayed(rule: InstrumentAlertRuleRow) {
  const displayUnit = telemetryPathSpec(rule.path)?.displayUnit ?? null
  const threshold = toDisplayUnit(displayUnit, rule.threshold)
  const hysteresis = Math.abs(
    toDisplayUnit(displayUnit, rule.threshold + rule.hysteresis) - threshold
  )
  return { threshold: round(threshold), hysteresis: round(hysteresis), unit: displayUnit ?? '' }
}

function ruleText(rule: InstrumentAlertRuleRow): string {
  const view = displayed(rule)
  return t('instruments.alerts.editor.rule', {
    path: rule.path,
    operator: t(`instruments.alerts.operator.${rule.operator}`),
    threshold: String(view.threshold),
    unit: view.unit,
  })
}

function add() {
  form
    .transform(({ hysteresis, threshold, ...data }) => ({
      ...data,
      threshold: Number(threshold),
      ...(hysteresis === '' ? {} : { hysteresis: Number(hysteresis) }),
    }))
    .post(`/boats/${props.boatId}/instrument-alert-rules`, {
      preserveScroll: true,
      onSuccess: () => form.reset('threshold', 'hysteresis'),
    })
}

function toggle(rule: InstrumentAlertRuleRow, enabled: boolean) {
  const view = displayed(rule)
  router.put(
    `/boats/${props.boatId}/instrument-alert-rules/${rule.id}`,
    {
      path: rule.path,
      operator: rule.operator,
      severity: rule.severity,
      threshold: view.threshold,
      hysteresis: view.hysteresis,
      enabled,
    },
    { preserveScroll: true }
  )
}

function remove(rule: InstrumentAlertRuleRow) {
  router.delete(`/boats/${props.boatId}/instrument-alert-rules/${rule.id}`, {
    preserveScroll: true,
  })
}
</script>

<template>
  <BaseCard padded data-testid="instrument-alert-rules">
    <template #header>
      <p class="text-sm font-semibold text-fg">{{ t('instruments.alerts.editor.title') }}</p>
    </template>
    <p class="mb-4 text-sm text-fg-muted">{{ t('instruments.alerts.editor.description') }}</p>

    <p v-if="rules.length === 0" class="mb-4 text-sm text-fg-muted">
      {{ t('instruments.alerts.editor.empty') }}
    </p>
    <ul v-else class="mb-4 space-y-2">
      <li
        v-for="rule in rules"
        :key="rule.id"
        data-testid="instrument-alert-rule"
        class="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
      >
        <span class="min-w-0 flex-1 text-sm text-fg">{{ ruleText(rule) }}</span>
        <BaseBadge :variant="rule.severity === 'critical' ? 'danger' : 'warning'">
          {{ t(`instruments.alerts.severity.${rule.severity}`) }}
        </BaseBadge>
        <BaseToggle
          :model-value="rule.enabled"
          :label="t('instruments.alerts.editor.enabled')"
          :name="`rule-${rule.id}-enabled`"
          @update:model-value="toggle(rule, $event)"
        />
        <BaseButton type="button" variant="danger" size="sm" @click="remove(rule)">
          {{ t('instruments.alerts.editor.delete') }}
        </BaseButton>
      </li>
    </ul>

    <form v-if="!limitReached" class="grid gap-4 sm:grid-cols-2" @submit.prevent="add">
      <BaseSelect
        v-model="form.path"
        :label="t('instruments.alerts.editor.path')"
        :placeholder="t('instruments.alerts.editor.pathPlaceholder')"
        :options="paths"
        :errors="form.errors"
        name="path"
        required
      />
      <BaseSelect
        v-model="form.operator"
        :label="t('instruments.alerts.editor.operator')"
        :options="operatorOptions"
        name="operator"
      />
      <BaseInput
        v-model="form.threshold"
        :label="t('instruments.alerts.editor.threshold', { unit })"
        :errors="form.errors"
        name="threshold"
        type="number"
        step="any"
        inputmode="decimal"
        required
      />
      <BaseInput
        v-model="form.hysteresis"
        :label="t('instruments.alerts.editor.hysteresis', { unit })"
        :hint="t('instruments.alerts.editor.hysteresisHint')"
        :errors="form.errors"
        name="hysteresis"
        type="number"
        step="any"
        min="0"
        inputmode="decimal"
      />
      <BaseSelect
        v-model="form.severity"
        :label="t('instruments.alerts.editor.severity')"
        :options="severityOptions"
        name="severity"
      />
      <div class="flex items-end">
        <BaseButton type="submit" :disabled="form.processing || form.path === ''">
          {{ t('instruments.alerts.editor.add') }}
        </BaseButton>
      </div>
    </form>
    <p v-else class="text-sm text-fg-muted">{{ t('instruments.alerts.editor.limit') }}</p>
  </BaseCard>
</template>
