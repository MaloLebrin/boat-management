<script setup lang="ts">
import { computed } from 'vue'
import BaseStatCard from '~/components/base/BaseStatCard.vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import { reportDelta } from '#shared/helpers/reporting_delta'
import type { FleetReport } from '#shared/types/reporting'

const props = defineProps<{
  report: FleetReport
  charterEnabled: boolean
  invoicingEnabled: boolean
}>()

const { t } = useT()
const { formatCurrency, formatNumber } = useNumberFormat()

function delta(current: number, previous: number): string {
  const value = reportDelta(current, previous)
  if (value === null) return t('reports.kpi.noDelta')
  return t('reports.kpi.delta', { delta: `${value > 0 ? '+' : ''}${value}` })
}

function money(value: number | null): string {
  return value === null ? '—' : formatCurrency(value)
}

interface Kpi {
  key: string
  label: string
  value: string
  delta?: string
  tone?: 'neutral' | 'success' | 'warning'
}

const cards = computed<Kpi[]>(() => {
  const { totals, previousTotals, plannedMaintenance } = props.report
  const cards: Kpi[] = [
    {
      key: 'costs',
      label: t('reports.kpi.costs'),
      value: formatCurrency(totals.costs.total),
      delta: delta(totals.costs.total, previousTotals.costs.total),
    },
  ]
  if (props.charterEnabled) {
    cards.push(
      {
        key: 'rentalRevenue',
        label: t('reports.kpi.rentalRevenue'),
        value: formatCurrency(totals.rentalRevenue),
        delta: delta(totals.rentalRevenue, previousTotals.rentalRevenue),
      },
      {
        key: 'margin',
        label: t('reports.kpi.margin'),
        value: formatCurrency(totals.margin),
        delta: delta(totals.margin, previousTotals.margin),
        tone: totals.margin < 0 ? 'warning' : 'neutral',
      },
      {
        key: 'occupancy',
        label: t('reports.kpi.occupancy'),
        value: `${formatNumber(totals.occupancyRate)} %`,
        delta: t('reports.kpi.rentalDays', { days: formatNumber(totals.rentalDays) }),
      },
      {
        key: 'costPerRentalDay',
        label: t('reports.kpi.costPerRentalDay'),
        value: money(totals.costPerRentalDay),
      }
    )
  }
  if (props.invoicingEnabled) {
    cards.push({
      key: 'invoicedPaid',
      label: t('reports.kpi.invoicedPaid'),
      value: formatCurrency(totals.invoicedPaid),
      delta: delta(totals.invoicedPaid, previousTotals.invoicedPaid),
    })
  }
  cards.push(
    {
      key: 'costPerEngineHour',
      label: t('reports.kpi.costPerEngineHour'),
      value: money(totals.costPerEngineHour),
    },
    {
      key: 'costPerNauticalMile',
      label: t('reports.kpi.costPerNauticalMile'),
      value: money(totals.costPerNauticalMile),
    },
    {
      key: 'plannedMaintenance',
      label: t('reports.kpi.plannedMaintenance'),
      value: formatCurrency(plannedMaintenance.amount),
      delta:
        plannedMaintenance.unestimatedCount > 0
          ? t('reports.kpi.unestimated', { count: String(plannedMaintenance.unestimatedCount) })
          : undefined,
    }
  )
  return cards
})
</script>

<template>
  <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" data-test="report-kpis">
    <BaseStatCard
      v-for="card in cards"
      :key="card.key"
      :data-test="`kpi-${card.key}`"
      :label="card.label"
      :value="card.value"
      :delta="card.delta"
      :tone="card.tone"
    />
  </div>
</template>
