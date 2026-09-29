<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'
import {
  REPORT_PERIOD_PRESETS,
  type FleetReportQuery,
  type ReportBoatOption,
  type ReportPeriod,
  type ReportPeriodPreset,
} from '#shared/types/reporting'

const props = defineProps<{
  query: FleetReportQuery
  /** Période effectivement appliquée : pré-remplit la plage personnalisée. */
  period: ReportPeriod | null
  boats: ReportBoatOption[]
  canExport: boolean
}>()

const { t } = useT()

const preset = ref<ReportPeriodPreset>(props.period?.preset ?? props.query.preset)
const from = ref(props.query.from ?? props.period?.from ?? '')
const to = ref(props.query.to ?? props.period?.to ?? '')
const boat = ref(props.query.boatId ? String(props.query.boatId) : '')

const presetOptions = computed(() =>
  REPORT_PERIOD_PRESETS.map((value) => ({ value, label: t(`reports.presets.${value}`) }))
)
const boatOptions = computed(() => [
  { value: '', label: t('reports.filters.allBoats') },
  ...props.boats.map((b) => ({ value: String(b.id), label: b.name })),
])

function params(): Record<string, string> {
  const out: Record<string, string> = { period: preset.value }
  if (preset.value === 'custom') {
    if (from.value) out.from = from.value
    if (to.value) out.to = to.value
  }
  if (boat.value) out.boat = boat.value
  return out
}

function apply() {
  router.get('/reports', params(), { preserveScroll: true, preserveState: true })
}

function onPreset(value: string | number | '') {
  preset.value = String(value) as ReportPeriodPreset
  if (preset.value !== 'custom') apply()
}

function onBoat(value: string | number | '') {
  boat.value = String(value)
  apply()
}

const exportHref = computed(() => `/reports/export.csv?${new URLSearchParams(params()).toString()}`)
</script>

<template>
  <div class="flex flex-wrap items-end gap-3" data-test="report-filters">
    <div class="w-48">
      <BaseSelect
        id="report-period"
        :label="t('reports.filters.period')"
        :model-value="preset"
        :options="presetOptions"
        @update:model-value="onPreset"
      />
    </div>
    <template v-if="preset === 'custom'">
      <div class="w-40">
        <BaseInput id="report-from" v-model="from" type="date" :label="t('reports.filters.from')" />
      </div>
      <div class="w-40">
        <BaseInput id="report-to" v-model="to" type="date" :label="t('reports.filters.to')" />
      </div>
      <BaseButton variant="secondary" data-test="report-apply" @click="apply">
        {{ t('reports.filters.apply') }}
      </BaseButton>
    </template>
    <div class="w-56">
      <BaseSelect
        id="report-boat"
        :label="t('reports.filters.boat')"
        :model-value="boat"
        :options="boatOptions"
        allow-empty
        @update:model-value="onBoat"
      />
    </div>
    <BaseButton
      v-if="canExport"
      variant="outline"
      :href="exportHref"
      external-href
      data-test="report-export"
    >
      {{ t('reports.filters.export') }}
    </BaseButton>
  </div>
</template>
