<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import LogbookRow from '~/components/navigation/LogbookRow.vue'
import NavigationBoatFilter from '~/components/navigation/NavigationBoatFilter.vue'
import QuickAddNavigationLogModal from '~/components/navigation/QuickAddNavigationLogModal.vue'
import { useT } from '~/composables/use_t'
import type { NavigationLogPortOption } from '~/types/boat_show'
import type { FleetBoatOption, FleetLogbookRow } from '../../../shared/types/navigation'

const { t } = useT()

const props = defineProps<{
  logs: FleetLogbookRow[]
  boats: FleetBoatOption[]
  selectedBoatId: number | null
  portOptions: NavigationLogPortOption[]
  canCreateNavigationLogs: boolean
}>()

const showQuickAdd = ref(false)

const totalCompleted = computed(() => props.logs.filter((l) => l.status === 'completed').length)
const totalDistanceNm = computed(() => props.logs.reduce((acc, l) => acc + (l.distanceNm ?? 0), 0))

const emptyActionLabel = computed(() =>
  props.selectedBoatId
    ? t('navigation.logbook.empty.actionBoat')
    : t('navigation.logbook.empty.action')
)

function onEmptyAction() {
  router.visit(props.selectedBoatId ? `/boats/${props.selectedBoatId}/navigation` : '/boats')
}
</script>

<template>
  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <header class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
      <div>
        <BaseHeading level="1">{{ t('navigation.logbook.title') }}</BaseHeading>
        <p class="mt-2 text-fg-muted">{{ t('navigation.logbook.subtitle') }}</p>
      </div>
      <div class="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <NavigationBoatFilter
          :boats="boats"
          :selected-boat-id="selectedBoatId"
          base-path="/navigation/logbook"
        />
        <BaseButton
          v-if="canCreateNavigationLogs && boats.length > 0"
          variant="primary"
          size="sm"
          type="button"
          @click="showQuickAdd = true"
        >
          {{ t('navigation.logbook.quickAdd') }}
        </BaseButton>
      </div>
    </header>

    <QuickAddNavigationLogModal
      v-model:open="showQuickAdd"
      :boats="boats"
      :port-options="portOptions"
      :default-boat-id="selectedBoatId"
    />

    <!-- Stats -->
    <div class="mt-8 grid grid-cols-3 gap-4">
      <div class="rounded-lg border border-border bg-surface-elevated p-4 text-center">
        <p class="text-2xl font-bold text-fg">{{ logs.length }}</p>
        <p class="text-sm text-fg-muted">{{ t('navigation.logbook.stats.trips') }}</p>
      </div>
      <div class="rounded-lg border border-border bg-surface-elevated p-4 text-center">
        <p class="text-2xl font-bold text-fg">{{ totalCompleted }}</p>
        <p class="text-sm text-fg-muted">{{ t('navigation.logbook.stats.completed') }}</p>
      </div>
      <div class="rounded-lg border border-border bg-surface-elevated p-4 text-center">
        <p class="text-2xl font-bold text-fg">{{ totalDistanceNm }} nm</p>
        <p class="text-sm text-fg-muted">{{ t('navigation.logbook.stats.totalDistance') }}</p>
      </div>
    </div>

    <!-- Table -->
    <div class="mt-8">
      <BaseEmptyState
        v-if="logs.length === 0"
        :title="t('navigation.logbook.empty.title')"
        :description="t('navigation.logbook.empty.description')"
        :action-label="emptyActionLabel"
        @action="onEmptyAction"
      />

      <div v-else class="overflow-x-auto rounded-lg border border-border">
        <table class="w-full text-left">
          <thead class="bg-surface-muted text-xs uppercase tracking-wider text-fg-muted">
            <tr>
              <th class="px-4 py-3">{{ t('navigation.logbook.columns.status') }}</th>
              <th class="px-4 py-3">{{ t('navigation.logbook.columns.boat') }}</th>
              <th class="px-4 py-3">{{ t('navigation.logbook.columns.departure') }}</th>
              <th class="px-4 py-3">{{ t('navigation.logbook.columns.arrival') }}</th>
              <th class="px-4 py-3">{{ t('navigation.logbook.columns.distance') }}</th>
              <th class="px-4 py-3">{{ t('navigation.logbook.columns.date') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border bg-surface-elevated">
            <LogbookRow v-for="row in logs" :key="row.id" :row="row" />
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
