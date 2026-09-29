<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type { FleetReportBoatRow, ReportMetrics } from '#shared/types/reporting'

defineProps<{
  rows: FleetReportBoatRow[]
  totals: ReportMetrics
  charterEnabled: boolean
  invoicingEnabled: boolean
}>()

const { t } = useT()
const { formatCurrency, formatNumber } = useNumberFormat()

function money(value: number | null): string {
  return value === null ? '—' : formatCurrency(value)
}
</script>

<template>
  <section
    class="rounded-(--radius-card) border border-border bg-surface-elevated shadow-(--shadow-xs)"
  >
    <h2 class="px-5 pt-5 text-sm font-semibold text-fg-muted">{{ t('reports.table.title') }}</h2>
    <p v-if="!rows.length" class="p-5 text-sm text-fg-subtle">{{ t('reports.table.empty') }}</p>
    <div v-else class="mt-3 overflow-x-auto">
      <table class="w-full text-sm" data-test="report-table">
        <thead class="border-b border-border text-left text-xs text-fg-muted">
          <tr>
            <th class="px-5 py-2 font-medium">{{ t('reports.table.boat') }}</th>
            <th class="px-3 py-2 text-right font-medium">{{ t('reports.table.costs') }}</th>
            <template v-if="charterEnabled">
              <th class="px-3 py-2 text-right font-medium">{{ t('reports.table.revenue') }}</th>
              <th class="px-3 py-2 text-right font-medium">{{ t('reports.table.margin') }}</th>
              <th class="px-3 py-2 text-right font-medium">{{ t('reports.table.occupancy') }}</th>
              <th class="px-3 py-2 text-right font-medium">
                {{ t('reports.table.costPerRentalDay') }}
              </th>
            </template>
            <th v-if="invoicingEnabled" class="px-3 py-2 text-right font-medium">
              {{ t('reports.table.invoicedPaid') }}
            </th>
            <th class="px-3 py-2 text-right font-medium">{{ t('reports.table.engineHours') }}</th>
            <th class="px-5 py-2 text-right font-medium">
              {{ t('reports.table.costPerEngineHour') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in [...rows, { ...totals, boatId: 0, boatName: '' }]"
            :key="row.boatId"
            class="border-b border-border last:border-0"
            :class="row.boatId === 0 ? 'font-semibold bg-surface-muted' : ''"
          >
            <td class="px-5 py-2">
              <Link v-if="row.boatId" :href="`/boats/${row.boatId}/budget`" class="text-brand">
                {{ row.boatName }}
              </Link>
              <span v-else>{{ t('reports.table.fleetTotal') }}</span>
            </td>
            <td class="px-3 py-2 text-right">{{ formatCurrency(row.costs.total) }}</td>
            <template v-if="charterEnabled">
              <td class="px-3 py-2 text-right">{{ formatCurrency(row.rentalRevenue) }}</td>
              <td class="px-3 py-2 text-right" :class="row.margin < 0 ? 'text-danger' : 'text-fg'">
                {{ formatCurrency(row.margin) }}
              </td>
              <td class="px-3 py-2 text-right">{{ formatNumber(row.occupancyRate) }} %</td>
              <td class="px-3 py-2 text-right">{{ money(row.costPerRentalDay) }}</td>
            </template>
            <td v-if="invoicingEnabled" class="px-3 py-2 text-right">
              {{ formatCurrency(row.invoicedPaid) }}
            </td>
            <td class="px-3 py-2 text-right">{{ formatNumber(row.engineHours) }}</td>
            <td class="px-5 py-2 text-right">{{ money(row.costPerEngineHour) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
