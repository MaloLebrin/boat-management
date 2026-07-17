<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import BoatShowHeaderActions from '~/components/boats/show/BoatShowHeaderActions.vue'
import BoatShowTabContent from '~/components/boats/show/BoatShowTabContent.vue'
import NavigationActiveCard from '~/components/boats/show/tabs/NavigationActiveCard.vue'
import { useBoatShowTabs } from '~/composables/use_boat_show_tabs'
import { useT } from '~/composables/use_t'
import { propulsionLabel } from '~/utils/boat_propulsion_label'
import type {
  AiSuggestion,
  BoatCreateIntent,
  BoatDocumentRow,
  BoatEquipmentActionRow,
  BoatIncidentRow,
  BoatPositionHistoryRow,
  BoatShowDetail,
  FuelLogRow,
  MaintenanceEventRow,
  MaintenanceSheetRow,
  MaintenanceTaskRow,
  NavigationLogPortOption,
  NavigationLogRow,
} from '~/types/boat_show'
import type { BoatPricingRow } from '../../../shared/types/boat_pricing'
import type { CrewMemberOption } from '../../../shared/types/crew'

const { t } = useT()

const props = defineProps<{
  boat: BoatShowDetail
  maintenanceEvents: MaintenanceEventRow[]
  maintenanceTasks: MaintenanceTaskRow[]
  maintenanceSheets: MaintenanceSheetRow[]
  boatDocuments: BoatDocumentRow[]
  equipmentActions: BoatEquipmentActionRow[]
  incidents: BoatIncidentRow[]
  fuelLogs: FuelLogRow[]
  navigationLogs: NavigationLogRow[]
  portOptions: NavigationLogPortOption[]
  crewMemberOptions: CrewMemberOption[]
  positionHistory: BoatPositionHistoryRow[]
  latestGpsPosition: BoatPositionHistoryRow | null
  canManageMaintenance: boolean
  canManageEquipment: boolean
  canManageDocuments: boolean
  canManageEquipmentActions: boolean
  canDeleteEquipmentActions: boolean
  canDeleteIncidents: boolean
  canCreateFuelLogs: boolean
  canDeleteFuelLogs: boolean
  canCreateNavigationLogs: boolean
  canUpdateNavigationLogs: boolean
  canDeleteNavigationLogs: boolean
  canExport: boolean
  aiSuggestions: AiSuggestion[] | null
  pricing: BoatPricingRow | null
  pricingEnabled: boolean
  canManagePricing: boolean
}>()

const {
  tab,
  activeGroupKey,
  groupTabs,
  activeGroupSubTabs,
  isTabLoading,
  openTasks,
  goToTab,
  goToGroup,
} = useBoatShowTabs({
  maintenanceTasks: () => props.maintenanceTasks,
  boatDocuments: () => props.boatDocuments,
  incidents: () => props.incidents,
  pricingEnabled: () => props.pricingEnabled,
})

// L'onglet cible n'est monté qu'après le rendu différé : on expose une intention
// explicite que le panneau consomme à son montage, puis remet à null (#358).
const createIntent = ref<BoatCreateIntent>(null)

const todayIso = computed(() => new Date().toISOString().slice(0, 10))

const overdueTasks = computed(() =>
  openTasks.value.filter((task) => task.dueAt && String(task.dueAt) <= todayIso.value)
)

const statusBadge = computed(() => {
  if (overdueTasks.value.length > 0)
    return { variant: 'warning' as const, label: t('boats.show.status.urgent') }
  if (openTasks.value.length > 0)
    return { variant: 'info' as const, label: t('boats.show.status.upcoming') }
  return { variant: 'success' as const, label: t('boats.show.status.ok') }
})

function openHistoryTab() {
  goToTab('history')
  createIntent.value = 'event'
}

function openTasksTab() {
  goToTab('tasks')
  createIntent.value = 'task'
}

function openNavigationLogTab() {
  goToTab('navigation-logs')
  createIntent.value = 'navigationLog'
}

function openEquipmentTab() {
  goToTab('equipment')
  createIntent.value = 'equipment'
}

function onCreateIntentConsumed() {
  createIntent.value = null
}

const activeNavigationLog = computed(
  () => props.navigationLogs.find((l) => l.status === 'in_progress') ?? null
)
</script>

<template>
  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb
      class="mb-4"
      :items="[{ label: t('boats.show.breadcrumbFleet'), href: '/boats' }, { label: boat.name }]"
    />

    <!-- Header -->
    <header class="space-y-6">
      <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-3">
            <BaseHeading level="1">{{ boat.name }}</BaseHeading>
            <BaseBadge :variant="statusBadge.variant">
              {{ statusBadge.label }}
            </BaseBadge>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
            <span v-if="boat.type">{{ boat.type }}</span>
            <span v-if="boat.type && boat.registrationNumber" class="text-fg-subtle">·</span>
            <span v-if="boat.registrationNumber">{{ boat.registrationNumber }}</span>
            <span
              v-if="(boat.type || boat.registrationNumber) && boat.propulsionType"
              class="text-fg-subtle"
              >·</span
            >
            <span v-if="boat.propulsionType">{{ propulsionLabel(t, boat.propulsionType) }}</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 justify-end">
          <BoatShowHeaderActions
            :boat-id="boat.id"
            :can-manage-maintenance="canManageMaintenance"
            :can-manage-equipment="canManageEquipment"
            :can-create-navigation-logs="canCreateNavigationLogs"
            :can-export="canExport"
            @add-event="openHistoryTab"
            @add-task="openTasksTab"
            @add-equipment="openEquipmentTab"
            @add-navigation-log="openNavigationLogTab"
          />
        </div>
      </div>

      <BaseTabs :model-value="activeGroupKey" :tabs="groupTabs" @update:model-value="goToGroup" />

      <BaseTabs
        v-if="activeGroupSubTabs.length > 1"
        :model-value="tab"
        :tabs="activeGroupSubTabs"
        @update:model-value="goToTab"
      />

      <NavigationActiveCard
        v-if="activeGroupKey === 'navigation' && activeNavigationLog"
        :boat="boat"
        :log="activeNavigationLog"
        :port-options="portOptions"
        :can-update="canUpdateNavigationLogs"
        :can-create-fuel-logs="canCreateFuelLogs"
      />
    </header>

    <BoatShowTabContent
      :tab="tab"
      v-bind="props"
      :is-loading="isTabLoading"
      :create-intent="createIntent"
      @go-to-tab="goToTab"
      @create-intent-consumed="onCreateIntentConsumed"
    />
  </div>
</template>
