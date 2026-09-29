<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import BaseHeading from '~/components/base/BaseHeading.vue'
import ReportBoatTable from '~/components/reports/ReportBoatTable.vue'
import ReportCostChart from '~/components/reports/ReportCostChart.vue'
import ReportFilters from '~/components/reports/ReportFilters.vue'
import ReportKpiGrid from '~/components/reports/ReportKpiGrid.vue'
import ReportLockedPreview from '~/components/reports/ReportLockedPreview.vue'
import ReportOccupancyChart from '~/components/reports/ReportOccupancyChart.vue'
import ReportRevenueCostChart from '~/components/reports/ReportRevenueCostChart.vue'
import ReportTopCosts from '~/components/reports/ReportTopCosts.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { ReportsPageProps } from '#shared/types/reporting'

defineProps<ReportsPageProps>()

const { t } = useT()
const { formatDate } = useDateFormat()
</script>

<template>
  <Head :title="t('reports.title')" />

  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <header class="flex flex-col gap-5">
      <div>
        <BaseHeading level="1">{{ t('reports.title') }}</BaseHeading>
        <p class="mt-1 text-sm text-fg-muted">{{ t('reports.subtitle') }}</p>
      </div>
      <ReportFilters
        v-if="!locked"
        :query="query"
        :period="report?.period ?? null"
        :boats="boats"
        :can-export="canExport"
      />
    </header>

    <div class="mt-8">
      <ReportLockedPreview v-if="locked || !report" />
      <div v-else class="space-y-6">
        <p class="text-sm text-fg-subtle" data-test="report-period">
          {{
            t('reports.periodRange', {
              from: formatDate(report.period.from),
              to: formatDate(report.period.to),
            })
          }}
        </p>
        <ReportKpiGrid
          :report="report"
          :charter-enabled="charterEnabled"
          :invoicing-enabled="invoicingEnabled"
        />
        <div class="grid gap-6 lg:grid-cols-3">
          <div class="lg:col-span-2">
            <ReportCostChart :monthly="report.monthly" />
          </div>
          <ReportTopCosts :costs="report.totals.costs" />
        </div>
        <div v-if="charterEnabled" class="grid gap-6 lg:grid-cols-2">
          <ReportRevenueCostChart :boats="report.boats" />
          <ReportOccupancyChart :monthly="report.monthly" />
        </div>
        <ReportBoatTable
          :rows="report.boats"
          :totals="report.totals"
          :charter-enabled="charterEnabled"
          :invoicing-enabled="invoicingEnabled"
        />
        <p class="text-xs text-fg-subtle">
          {{ t('reports.notes.revenue') }}
          <template v-if="!charterEnabled"> {{ t('reports.notes.noCharter') }}</template>
        </p>
      </div>
    </div>
  </div>
</template>
