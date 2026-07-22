<script setup lang="ts">
import { computed } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import FuelLogRow from '~/components/navigation/FuelLogRow.vue'
import NavigationBoatFilter from '~/components/navigation/NavigationBoatFilter.vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type { FleetBoatOption, FleetFuelLogRow } from '../../../shared/types/navigation'

const { t } = useT()
const { formatNumber, formatCurrency } = useNumberFormat()

const props = defineProps<{
  logs: FleetFuelLogRow[]
  boats: FleetBoatOption[]
  selectedBoatId: number | null
}>()

const emptyActionLabel = computed(() =>
  props.selectedBoatId ? t('navigation.fuel.empty.actionBoat') : t('navigation.fuel.empty.action')
)

function onEmptyAction() {
  router.visit(props.selectedBoatId ? `/boats/${props.selectedBoatId}/navigation` : '/boats')
}

const totalLiters = computed(() =>
  formatNumber(
    props.logs.reduce((acc, l) => acc + l.quantityLiters, 0),
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }
  )
)

const totalCost = computed(() =>
  formatCurrency(props.logs.reduce((acc, l) => acc + (l.totalCost ?? 0), 0))
)
</script>

<template>
  <Head :title="t('navigation.fuel.title')" />
  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <header class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
      <div>
        <BaseHeading level="1">{{ t('navigation.fuel.title') }}</BaseHeading>
        <p class="mt-2 text-fg-muted">{{ t('navigation.fuel.subtitle') }}</p>
      </div>
      <NavigationBoatFilter
        :boats="boats"
        :selected-boat-id="selectedBoatId"
        base-path="/navigation/fuel"
      />
    </header>

    <!-- Stats -->
    <div class="mt-8 grid grid-cols-2 gap-4">
      <div class="rounded-lg border border-border bg-surface-elevated p-4 text-center">
        <p class="text-2xl font-bold text-fg">{{ totalLiters }} L</p>
        <p class="text-sm text-fg-muted">{{ t('navigation.fuel.stats.totalLiters') }}</p>
      </div>
      <div class="rounded-lg border border-border bg-surface-elevated p-4 text-center">
        <p class="text-2xl font-bold text-fg">{{ totalCost }}</p>
        <p class="text-sm text-fg-muted">{{ t('navigation.fuel.stats.totalCost') }}</p>
      </div>
    </div>

    <!-- Table -->
    <div class="mt-8">
      <BaseEmptyState
        v-if="logs.length === 0"
        :title="t('navigation.fuel.empty.title')"
        :description="t('navigation.fuel.empty.description')"
        :action-label="emptyActionLabel"
        @action="onEmptyAction"
      />

      <div v-else class="overflow-x-auto rounded-lg border border-border">
        <table class="w-full text-left">
          <thead class="bg-surface-muted text-xs uppercase tracking-wider text-fg-muted">
            <tr>
              <th class="px-4 py-3">{{ t('navigation.fuel.columns.boat') }}</th>
              <th class="px-4 py-3">{{ t('navigation.fuel.columns.date') }}</th>
              <th class="px-4 py-3">{{ t('navigation.fuel.columns.quantity') }}</th>
              <th class="px-4 py-3">{{ t('navigation.fuel.columns.cost') }}</th>
              <th class="px-4 py-3">{{ t('navigation.fuel.columns.supplier') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border bg-surface-elevated">
            <FuelLogRow v-for="row in logs" :key="row.id" :row="row" />
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
