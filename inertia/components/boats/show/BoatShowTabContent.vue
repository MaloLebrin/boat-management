<script setup lang="ts">
import BoatShowTabAdminDocs from '~/components/boats/show/tabs/BoatShowTabAdminDocs.vue'
import BoatShowTabDocuments from '~/components/boats/show/tabs/BoatShowTabDocuments.vue'
import BoatShowTabEquipment from '~/components/boats/show/tabs/BoatShowTabEquipment.vue'
import BoatShowTabFuelLogs from '~/components/boats/show/tabs/BoatShowTabFuelLogs.vue'
import BoatShowTabHistory from '~/components/boats/show/tabs/BoatShowTabHistory.vue'
import BoatShowTabIncidents from '~/components/boats/show/tabs/BoatShowTabIncidents.vue'
import BoatShowTabNavigationLogs from '~/components/boats/show/tabs/BoatShowTabNavigationLogs.vue'
import BoatShowTabOverview from '~/components/boats/show/tabs/BoatShowTabOverview.vue'
import BoatShowTabSheets from '~/components/boats/show/tabs/BoatShowTabSheets.vue'
import BoatShowTabSpecs from '~/components/boats/show/tabs/BoatShowTabSpecs.vue'
import BoatShowTabTasks from '~/components/boats/show/tabs/BoatShowTabTasks.vue'
import type {
  AiSuggestion,
  BoatDocumentRow,
  BoatIncidentRow,
  BoatShowDetail,
  FuelLogRow,
  MaintenanceEventRow,
  MaintenanceSheetRow,
  MaintenanceTaskRow,
  NavigationLogPortOption,
  NavigationLogRow,
} from '~/types/boat_show'

type TabKey =
  | 'overview'
  | 'specs'
  | 'equipment'
  | 'history'
  | 'tasks'
  | 'documents'
  | 'sheets'
  | 'incidents'
  | 'fuel'
  | 'navigation-logs'
  | 'admin-docs'

defineProps<{
  tab: TabKey
  boat: BoatShowDetail
  maintenanceEvents: MaintenanceEventRow[]
  maintenanceTasks: MaintenanceTaskRow[]
  maintenanceSheets: MaintenanceSheetRow[]
  incidents: BoatIncidentRow[]
  fuelLogs: FuelLogRow[]
  navigationLogs: NavigationLogRow[]
  portOptions: NavigationLogPortOption[]
  boatDocuments: BoatDocumentRow[]
  canManageMaintenance: boolean
  canManageEquipment: boolean
  canManageDocuments: boolean
  canExport: boolean
  canDeleteIncidents: boolean
  canCreateFuelLogs: boolean
  canDeleteFuelLogs: boolean
  canCreateNavigationLogs: boolean
  canUpdateNavigationLogs: boolean
  canDeleteNavigationLogs: boolean
  aiSuggestions: AiSuggestion[] | null
  createEventNonce: number
  createTaskNonce: number
}>()

defineEmits<{ goToTab: [key: string] }>()
</script>

<template>
  <Transition name="tab" mode="out-in">
    <div :key="tab" class="mt-8">
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

      <BoatShowTabEquipment
        v-else-if="tab === 'equipment'"
        :boat="boat"
        :can-manage-equipment="canManageEquipment"
      />

      <BoatShowTabHistory
        v-else-if="tab === 'history'"
        :boat="boat"
        :maintenance-events="maintenanceEvents"
        :can-manage-maintenance="canManageMaintenance"
        :create-event-nonce="createEventNonce"
      />

      <BoatShowTabTasks
        v-else-if="tab === 'tasks'"
        :boat="boat"
        :maintenance-tasks="maintenanceTasks"
        :can-manage-maintenance="canManageMaintenance"
        :create-task-nonce="createTaskNonce"
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

      <BoatShowTabIncidents
        v-else-if="tab === 'incidents'"
        :boat="boat"
        :incidents="incidents"
        :can-manage="canManageMaintenance"
        :can-delete="canDeleteIncidents"
      />

      <BoatShowTabFuelLogs
        v-else-if="tab === 'fuel'"
        :boat="boat"
        :fuel-logs="fuelLogs"
        :can-manage="canCreateFuelLogs"
        :can-delete="canDeleteFuelLogs"
      />

      <BoatShowTabNavigationLogs
        v-else-if="tab === 'navigation-logs'"
        :boat="boat"
        :navigation-logs="navigationLogs"
        :port-options="portOptions"
        :can-create="canCreateNavigationLogs"
        :can-update="canUpdateNavigationLogs"
        :can-delete="canDeleteNavigationLogs"
      />

      <BoatShowTabAdminDocs
        v-else-if="tab === 'admin-docs'"
        :boat="boat"
        :boat-documents="boatDocuments"
        :can-manage="canManageDocuments"
      />
    </div>
  </Transition>
</template>
