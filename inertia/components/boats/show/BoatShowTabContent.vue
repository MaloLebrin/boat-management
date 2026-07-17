<script setup lang="ts">
import BaseSkeleton from '~/components/base/BaseSkeleton.vue'
import BoatShowTabAdminDocs from '~/components/boats/show/tabs/BoatShowTabAdminDocs.vue'
import BoatShowTabDocuments from '~/components/boats/show/tabs/BoatShowTabDocuments.vue'
import BoatShowTabEquipment from '~/components/boats/show/tabs/BoatShowTabEquipment.vue'
import BoatShowTabEquipmentActions from '~/components/boats/show/tabs/BoatShowTabEquipmentActions.vue'
import BoatShowTabFuelLogs from '~/components/boats/show/tabs/BoatShowTabFuelLogs.vue'
import BoatShowTabHistory from '~/components/boats/show/tabs/BoatShowTabHistory.vue'
import BoatShowTabIncidents from '~/components/boats/show/tabs/BoatShowTabIncidents.vue'
import BoatShowTabNavigationLogs from '~/components/boats/show/tabs/BoatShowTabNavigationLogs.vue'
import BoatShowTabOverview from '~/components/boats/show/tabs/BoatShowTabOverview.vue'
import BoatShowTabPosition from '~/components/boats/show/tabs/BoatShowTabPosition.vue'
import BoatShowTabPricing from '~/components/boats/show/tabs/BoatShowTabPricing.vue'
import BoatShowTabSheets from '~/components/boats/show/tabs/BoatShowTabSheets.vue'
import BoatShowTabSpecs from '~/components/boats/show/tabs/BoatShowTabSpecs.vue'
import BoatShowTabTasks from '~/components/boats/show/tabs/BoatShowTabTasks.vue'
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
import type { BoatPricingRow } from '../../../../shared/types/boat_pricing'
import type { CrewMemberOption } from '../../../../shared/types/crew'

type TabKey =
  | 'overview'
  | 'specs'
  | 'pricing'
  | 'equipment'
  | 'equipmentActions'
  | 'history'
  | 'tasks'
  | 'documents'
  | 'sheets'
  | 'admin-docs'
  | 'navigation-logs'
  | 'fuel'
  | 'incidents'
  | 'position'

defineProps<{
  tab: TabKey
  isLoading: boolean
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
  createIntent: BoatCreateIntent
  pricing: BoatPricingRow | null
  pricingEnabled: boolean
  canManagePricing: boolean
}>()

defineEmits<{ goToTab: [key: string]; createIntentConsumed: [] }>()
</script>

<template>
  <Transition name="tab" mode="out-in">
    <div v-if="isLoading" key="loading" class="mt-8 space-y-4" data-testid="tab-content-skeleton">
      <BaseSkeleton height-class="h-8" width-class="w-48" />
      <BaseSkeleton height-class="h-32" />
      <BaseSkeleton height-class="h-32" />
      <BaseSkeleton height-class="h-32" />
    </div>

    <div v-else :key="tab" class="mt-8">
      <BoatShowTabOverview
        v-if="tab === 'overview'"
        :boat="boat"
        :maintenance-tasks="maintenanceTasks"
        :maintenance-events="maintenanceEvents"
        :can-manage="canManageEquipment"
        :ai-suggestions="aiSuggestions"
        @go-to-tab="$emit('goToTab', $event)"
      />

      <BoatShowTabSpecs v-else-if="tab === 'specs'" :boat="boat" />

      <BoatShowTabPricing
        v-else-if="tab === 'pricing'"
        :boat="boat"
        :pricing="pricing"
        :can-manage="canManagePricing"
      />

      <BoatShowTabEquipment
        v-else-if="tab === 'equipment'"
        :boat="boat"
        :can-manage-equipment="canManageEquipment"
        :can-manage-actions="canManageEquipmentActions"
        :create-intent="createIntent"
        @create-intent-consumed="$emit('createIntentConsumed')"
      />

      <BoatShowTabEquipmentActions
        v-else-if="tab === 'equipmentActions'"
        :boat="boat"
        :equipment-actions="equipmentActions"
        :can-manage="canManageEquipmentActions"
        :can-delete="canDeleteEquipmentActions"
      />

      <BoatShowTabHistory
        v-else-if="tab === 'history'"
        :boat="boat"
        :maintenance-events="maintenanceEvents"
        :can-manage-maintenance="canManageMaintenance"
        :can-export="canExport"
        :create-intent="createIntent"
        @create-intent-consumed="$emit('createIntentConsumed')"
      />

      <BoatShowTabTasks
        v-else-if="tab === 'tasks'"
        :boat="boat"
        :maintenance-tasks="maintenanceTasks"
        :can-manage-maintenance="canManageMaintenance"
        :create-intent="createIntent"
        @create-intent-consumed="$emit('createIntentConsumed')"
      />

      <BoatShowTabSheets
        v-else-if="tab === 'sheets'"
        :boat="boat"
        :sheets="maintenanceSheets"
        :can-manage="canManageMaintenance"
      />

      <BoatShowTabDocuments
        v-else-if="tab === 'documents'"
        :boat="boat"
        :can-manage="canManageEquipment"
      />

      <BoatShowTabAdminDocs
        v-else-if="tab === 'admin-docs'"
        :boat="boat"
        :boat-documents="boatDocuments"
        :can-manage="canManageDocuments"
      />

      <BoatShowTabNavigationLogs
        v-else-if="tab === 'navigation-logs'"
        :boat="boat"
        :navigation-logs="navigationLogs"
        :port-options="portOptions"
        :crew-member-options="crewMemberOptions"
        :can-create="canCreateNavigationLogs"
        :can-update="canUpdateNavigationLogs"
        :can-delete="canDeleteNavigationLogs"
        :create-intent="createIntent"
        @create-intent-consumed="$emit('createIntentConsumed')"
      />

      <BoatShowTabFuelLogs
        v-else-if="tab === 'fuel'"
        :boat="boat"
        :fuel-logs="fuelLogs"
        :can-manage="canCreateFuelLogs"
        :can-delete="canDeleteFuelLogs"
      />

      <BoatShowTabIncidents
        v-else-if="tab === 'incidents'"
        :boat="boat"
        :incidents="incidents"
        :can-manage="canManageMaintenance"
        :can-delete="canDeleteIncidents"
      />

      <BoatShowTabPosition
        v-else-if="tab === 'position'"
        :boat-id="boat.id"
        :position-history="positionHistory"
        :latest-gps-position="latestGpsPosition"
        :can-manage="canManageMaintenance"
      />
    </div>
  </Transition>
</template>
