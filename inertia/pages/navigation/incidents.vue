<script setup lang="ts">
import { computed } from 'vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import IncidentRow from '~/components/navigation/IncidentRow.vue'
import NavigationBoatFilter from '~/components/navigation/NavigationBoatFilter.vue'
import { useT } from '~/composables/use_t'
import type { FleetBoatOption, FleetIncidentRow } from '../../../shared/types/navigation'

const { t } = useT()

const props = defineProps<{
  incidents: FleetIncidentRow[]
  boats: FleetBoatOption[]
  selectedBoatId: number | null
}>()

const openCount = computed(() => props.incidents.filter((i) => i.status === 'open').length)
const closedCount = computed(() => props.incidents.filter((i) => i.status === 'closed').length)
</script>

<template>
  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <header class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
      <div>
        <BaseHeading level="1">{{ t('navigation.incidents.title') }}</BaseHeading>
        <p class="mt-2 text-fg-muted">{{ t('navigation.incidents.subtitle') }}</p>
      </div>
      <NavigationBoatFilter
        :boats="boats"
        :selected-boat-id="selectedBoatId"
        base-path="/navigation/incidents"
      />
    </header>

    <!-- Stats -->
    <div class="mt-8 grid grid-cols-3 gap-4">
      <div class="rounded-lg border border-border bg-surface-elevated p-4 text-center">
        <p class="text-2xl font-bold text-fg">{{ incidents.length }}</p>
        <p class="text-sm text-fg-muted">{{ t('navigation.incidents.stats.total') }}</p>
      </div>
      <div class="rounded-lg border border-border bg-surface-elevated p-4 text-center">
        <p class="text-2xl font-bold text-coral-500">{{ openCount }}</p>
        <p class="text-sm text-fg-muted">{{ t('navigation.incidents.stats.open') }}</p>
      </div>
      <div class="rounded-lg border border-border bg-surface-elevated p-4 text-center">
        <p class="text-2xl font-bold text-fg-subtle">{{ closedCount }}</p>
        <p class="text-sm text-fg-muted">{{ t('navigation.incidents.stats.closed') }}</p>
      </div>
    </div>

    <!-- Table -->
    <div class="mt-8">
      <BaseEmptyState
        v-if="incidents.length === 0"
        :title="t('navigation.incidents.empty.title')"
        :description="t('navigation.incidents.empty.description')"
        :action-label="t('navigation.incidents.empty.action')"
        @action="$inertia.visit('/boats')"
      />

      <div v-else class="overflow-x-auto rounded-lg border border-border">
        <table class="w-full text-left">
          <thead class="bg-surface-muted text-xs uppercase tracking-wider text-fg-muted">
            <tr>
              <th class="px-4 py-3">{{ t('navigation.incidents.columns.status') }}</th>
              <th class="px-4 py-3">{{ t('navigation.incidents.columns.boat') }}</th>
              <th class="px-4 py-3">{{ t('navigation.incidents.columns.type') }}</th>
              <th class="px-4 py-3">{{ t('navigation.incidents.columns.date') }}</th>
              <th class="px-4 py-3">{{ t('navigation.incidents.columns.location') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border bg-surface-elevated">
            <IncidentRow v-for="row in incidents" :key="row.id" :row="row" />
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
