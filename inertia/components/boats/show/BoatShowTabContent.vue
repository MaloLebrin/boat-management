<script setup lang="ts">
import { computed } from 'vue'
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
import type { BoatShowTabKey } from '~/composables/use_boat_show_tabs'
import { isTabDataReady } from '~/utils/boat_show_tab_data'
import type { BoatPricingRow } from '../../../../shared/types/boat_pricing'
import type { SafetyComplianceReport } from '../../../../shared/types/safety'
import type { CrewMemberOption } from '../../../../shared/types/crew'

// Les jeux de données d'onglet arrivent en props différées (#463) : `undefined`
// signifie « pas encore chargé », et l'onglet concerné rend un skeleton.
const props = defineProps<{
  tab: BoatShowTabKey
  isLoading: boolean
  boat: BoatShowDetail
  maintenanceEvents?: MaintenanceEventRow[]
  maintenanceTasks?: MaintenanceTaskRow[]
  maintenanceSheets?: MaintenanceSheetRow[]
  boatDocuments?: BoatDocumentRow[]
  equipmentActions?: BoatEquipmentActionRow[]
  incidents?: BoatIncidentRow[]
  fuelLogs?: FuelLogRow[]
  navigationLogs?: NavigationLogRow[]
  portOptions?: NavigationLogPortOption[]
  crewMemberOptions?: CrewMemberOption[]
  aiSuggestions?: AiSuggestion[] | null
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
  createIntent: BoatCreateIntent
  pricing: BoatPricingRow | null
  pricingEnabled: boolean
  canManagePricing: boolean
  /** Port de l'org rapproché du `homePort` texte libre (#579), ou `null`. */
  homePortId: number | null
  /** Rapport de conformité Division 240 (#582) — calculé côté serveur. */
  safetyCompliance: SafetyComplianceReport
}>()

defineEmits<{ goToTab: [key: string]; createIntentConsumed: [] }>()

const isMaintenanceGroupLoaded = computed(
  () =>
    props.maintenanceEvents !== undefined &&
    props.maintenanceTasks !== undefined &&
    props.maintenanceSheets !== undefined &&
    props.boatDocuments !== undefined &&
    props.equipmentActions !== undefined &&
    props.aiSuggestions !== undefined
)

const isNavigationGroupLoaded = computed(
  () =>
    props.navigationLogs !== undefined &&
    props.fuelLogs !== undefined &&
    props.incidents !== undefined &&
    props.portOptions !== undefined &&
    props.crewMemberOptions !== undefined
)

// Skeleton tant que le contenu n'est pas montable : soit la bascule d'onglet
// est en cours (#361), soit les données différées de l'onglet manquent (#463).
const showSkeleton = computed(
  () =>
    props.isLoading ||
    !isTabDataReady(props.tab, {
      maintenance: isMaintenanceGroupLoaded.value,
      navigation: isNavigationGroupLoaded.value,
    })
)
</script>

<template>
  <Transition name="tab" mode="out-in">
    <div
      v-if="showSkeleton"
      key="loading"
      class="mt-8 space-y-4"
      data-testid="tab-content-skeleton"
    >
      <BaseSkeleton height-class="h-8" width-class="w-48" />
      <BaseSkeleton height-class="h-32" />
      <BaseSkeleton height-class="h-32" />
      <BaseSkeleton height-class="h-32" />
    </div>

    <div v-else :key="tab" class="mt-8">
      <BoatShowTabOverview
        v-if="tab === 'overview'"
        :boat="boat"
        :maintenance-tasks="maintenanceTasks ?? []"
        :maintenance-events="maintenanceEvents ?? []"
        :can-manage="canManageEquipment"
        :ai-suggestions="aiSuggestions ?? null"
        @go-to-tab="$emit('goToTab', $event)"
      />

      <BoatShowTabSpecs v-else-if="tab === 'specs'" :boat="boat" :home-port-id="homePortId" />

      <BoatShowTabPricing
        v-else-if="tab === 'pricing'"
        :boat="boat"
        :pricing="pricing"
        :can-manage="canManagePricing"
      />

      <BoatShowTabEquipment
        v-else-if="tab === 'equipment'"
        :boat="boat"
        :safety-compliance="safetyCompliance"
        :can-manage-equipment="canManageEquipment"
        :can-manage-actions="canManageEquipmentActions"
        :create-intent="createIntent"
        @create-intent-consumed="$emit('createIntentConsumed')"
      />

      <BoatShowTabEquipmentActions
        v-else-if="tab === 'equipmentActions'"
        :boat="boat"
        :equipment-actions="equipmentActions ?? []"
        :can-manage="canManageEquipmentActions"
        :can-delete="canDeleteEquipmentActions"
      />

      <BoatShowTabHistory
        v-else-if="tab === 'history'"
        :boat="boat"
        :maintenance-events="maintenanceEvents ?? []"
        :can-manage-maintenance="canManageMaintenance"
        :can-export="canExport"
        :create-intent="createIntent"
        @create-intent-consumed="$emit('createIntentConsumed')"
      />

      <BoatShowTabTasks
        v-else-if="tab === 'tasks'"
        :boat="boat"
        :maintenance-tasks="maintenanceTasks ?? []"
        :can-manage-maintenance="canManageMaintenance"
        :create-intent="createIntent"
        @create-intent-consumed="$emit('createIntentConsumed')"
      />

      <BoatShowTabSheets
        v-else-if="tab === 'sheets'"
        :boat="boat"
        :sheets="maintenanceSheets ?? []"
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
        :boat-documents="boatDocuments ?? []"
        :can-manage="canManageDocuments"
      />

      <BoatShowTabNavigationLogs
        v-else-if="tab === 'navigation-logs'"
        :boat="boat"
        :navigation-logs="navigationLogs ?? []"
        :port-options="portOptions ?? []"
        :crew-member-options="crewMemberOptions ?? []"
        :can-create="canCreateNavigationLogs"
        :can-update="canUpdateNavigationLogs"
        :can-delete="canDeleteNavigationLogs"
        :create-intent="createIntent"
        @create-intent-consumed="$emit('createIntentConsumed')"
      />

      <BoatShowTabFuelLogs
        v-else-if="tab === 'fuel'"
        :boat="boat"
        :fuel-logs="fuelLogs ?? []"
        :can-manage="canCreateFuelLogs"
        :can-delete="canDeleteFuelLogs"
      />

      <BoatShowTabIncidents
        v-else-if="tab === 'incidents'"
        :boat="boat"
        :incidents="incidents ?? []"
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
