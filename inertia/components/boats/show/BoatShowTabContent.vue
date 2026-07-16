<script setup lang="ts">
import BoatShowTabAdminDocs from '~/components/boats/show/tabs/BoatShowTabAdminDocs.vue'
import BoatShowTabDocuments from '~/components/boats/show/tabs/BoatShowTabDocuments.vue'
import BoatShowTabEquipment from '~/components/boats/show/tabs/BoatShowTabEquipment.vue'
import BoatShowTabEquipmentActions from '~/components/boats/show/tabs/BoatShowTabEquipmentActions.vue'
import BoatShowTabHistory from '~/components/boats/show/tabs/BoatShowTabHistory.vue'
import BoatShowTabOverview from '~/components/boats/show/tabs/BoatShowTabOverview.vue'
import BoatShowTabPricing from '~/components/boats/show/tabs/BoatShowTabPricing.vue'
import BoatShowTabSheets from '~/components/boats/show/tabs/BoatShowTabSheets.vue'
import BoatShowTabSpecs from '~/components/boats/show/tabs/BoatShowTabSpecs.vue'
import BoatShowTabTasks from '~/components/boats/show/tabs/BoatShowTabTasks.vue'
import type {
  AiSuggestion,
  BoatCreateIntent,
  BoatDocumentRow,
  BoatEquipmentActionRow,
  BoatShowDetail,
  MaintenanceEventRow,
  MaintenanceSheetRow,
  MaintenanceTaskRow,
} from '~/types/boat_show'
import type { BoatPricingRow } from '../../../../shared/types/boat_pricing'

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

defineProps<{
  tab: TabKey
  boat: BoatShowDetail
  maintenanceEvents: MaintenanceEventRow[]
  maintenanceTasks: MaintenanceTaskRow[]
  maintenanceSheets: MaintenanceSheetRow[]
  boatDocuments: BoatDocumentRow[]
  equipmentActions: BoatEquipmentActionRow[]
  canManageMaintenance: boolean
  canManageEquipment: boolean
  canManageDocuments: boolean
  canManageEquipmentActions: boolean
  canDeleteEquipmentActions: boolean
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
    </div>
  </Transition>
</template>
