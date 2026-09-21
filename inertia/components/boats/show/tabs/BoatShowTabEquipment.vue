<script setup lang="ts">
import { sortEnginesByStatus } from '#shared/helpers/engine'
import { onMounted, ref, watch } from 'vue'
import BoatGenericEquipmentCard from '~/components/boats/equipment/BoatGenericEquipmentCard.vue'
import BoatShowEnginesCard from '~/components/boats/engine/BoatShowEnginesCard.vue'
import BoatShowRigCard from '~/components/boats/rig/BoatShowRigCard.vue'
import BoatSafetyCompliancePanel from '~/components/boats/safety/BoatSafetyCompliancePanel.vue'
import BoatSafetyEquipmentCard from '~/components/boats/safety/BoatSafetyEquipmentCard.vue'
import BoatShowSailsCard from '~/components/boats/sail/BoatShowSailsCard.vue'
import BoatEquipmentAddModal from '~/components/boats/show/modals/BoatEquipmentAddModal.vue'
import BoatEquipmentActionModal from '~/components/boats/equipment-actions/BoatEquipmentActionModal.vue'
import BoatIncidentModal from '~/components/boats/incidents/BoatIncidentModal.vue'
import BoatMaintenanceTaskModal from '~/components/boats/maintenance/BoatMaintenanceTaskModal.vue'
import { shouldReopenEngineForm } from '~/composables/use_engine_form_draft'
import { shouldReopenGenericEquipmentForm } from '~/composables/use_generic_equipment_form_draft'
import { useT } from '~/composables/use_t'
import type { BoatCreateIntent, BoatShowDetail, EquipmentActionPrefill } from '~/types/boat_show'
import type { SafetyComplianceReport } from '#shared/types/safety'
import type { IncidentTargetRef } from '#shared/types/incident'
import type { TaskEquipmentRef } from '#shared/types/maintenance'

const props = withDefaults(
  defineProps<{
    boat: BoatShowDetail
    canManageEquipment: boolean
    canManageActions: boolean
    /** Droit `maintenance.create` : raccourci « + Tâche » sur chaque équipement. */
    canManageMaintenance?: boolean
    /** Droit `incidents.create` : raccourci « Incident » sur chaque équipement (#813). */
    canReportIncident?: boolean
    createIntent?: BoatCreateIntent
    /** Rapport de conformité Division 240 (#582), calculé côté serveur. */
    safetyCompliance: SafetyComplianceReport
  }>(),
  { createIntent: null, canManageMaintenance: false, canReportIncident: false }
)

const emit = defineEmits<{ createIntentConsumed: [] }>()

const { t } = useT()

const equipmentFilter = ref<'all' | 'engine' | 'sail' | 'rig' | 'safety' | 'generic'>('all')
// Rouverte depuis l'URL après la visite partielle du catalogue moteur (#573)
// ou équipement (#577), qui remonte l'arbre et emporterait sinon ce booléen.
const isAddModalOpen = ref(
  shouldReopenEngineForm('equipment-add') || shouldReopenGenericEquipmentForm('equipment-add')
)

// L'onglet est monté après la demande d'ouverture : on consomme l'intention au
// montage (et si elle change alors que l'onglet est déjà affiché) — #365.
function consumeCreateIntent() {
  if (props.createIntent !== 'equipment') return
  if (props.canManageEquipment) isAddModalOpen.value = true
  emit('createIntentConsumed')
}

onMounted(consumeCreateIntent)
watch(() => props.createIntent, consumeCreateIntent)

// Type demandé par le panneau de conformité : transmis à la carte inventaire,
// qui ouvre sa modale de création pré-remplie puis rend la main (#582).
const safetyPrefillType = ref<string | null>(null)

// Equipment-action modal raised from a degraded equipment card (#313)
const isActionModalOpen = ref(false)
const actionPrefill = ref<EquipmentActionPrefill | null>(null)

function openActionModal(payload: EquipmentActionPrefill) {
  actionPrefill.value = payload
  isActionModalOpen.value = true
}

// Tâche rattachée à un équipement, ouverte depuis sa carte : équipement figé.
const isTaskModalOpen = ref(false)
const taskEquipment = ref<TaskEquipmentRef | null>(null)

function openTaskModal(equipment: TaskEquipmentRef) {
  taskEquipment.value = equipment
  isTaskModalOpen.value = true
}

// Incident rattaché à un équipement, ouvert depuis sa carte : cible figée (#813).
const isIncidentModalOpen = ref(false)
const incidentTarget = ref<IncidentTargetRef | null>(null)

function openIncidentModal(target: IncidentTargetRef) {
  incidentTarget.value = target
  isIncidentModalOpen.value = true
}
</script>

<template>
  <BoatEquipmentAddModal
    v-model:open="isAddModalOpen"
    :boat="boat"
    :can-manage-equipment="canManageEquipment"
  />

  <BoatEquipmentActionModal
    v-model:open="isActionModalOpen"
    :boat="boat"
    :editing-action="null"
    :prefill="actionPrefill"
  />

  <BoatMaintenanceTaskModal
    v-if="canManageMaintenance"
    v-model:open="isTaskModalOpen"
    :boat-id="boat.id"
    :equipment="boat"
    :prefill="taskEquipment ? { equipment: taskEquipment } : null"
    :lock-equipment="taskEquipment !== null"
  />

  <BoatIncidentModal
    v-if="canReportIncident && incidentTarget"
    v-model:open="isIncidentModalOpen"
    :boat-id="boat.id"
    :equipment="boat"
    :prefill="{ target: incidentTarget }"
    lock-target
  />

  <div class="space-y-6">
    <!-- Header row with filter pills and add button -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="filter in [
            { key: 'all', label: t('common.all') },
            { key: 'engine', label: t('boats.equipmentAddModal.categories.engine') },
            { key: 'sail', label: t('boats.equipmentAddModal.categories.sail') },
            { key: 'rig', label: t('boats.equipmentAddModal.categories.rig') },
            { key: 'safety', label: t('boats.safetyEquipment.title') },
            { key: 'generic', label: t('boats.genericEquipment.filterLabel') },
          ]"
          :key="filter.key"
          type="button"
          :class="[
            'rounded-full px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer',
            equipmentFilter === filter.key
              ? 'bg-brand text-white'
              : 'bg-surface-muted text-fg-muted hover:bg-surface-elevated hover:text-fg',
          ]"
          @click="equipmentFilter = filter.key as typeof equipmentFilter"
        >
          {{ filter.label }}
        </button>
      </div>
      <button
        v-if="canManageEquipment"
        type="button"
        class="rounded-lg border border-brand px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand hover:text-white transition-colors"
        @click="isAddModalOpen = true"
      >
        + {{ t('boats.equipmentAddModal.title') }}
      </button>
    </div>

    <!-- Engine cards -->
    <div v-if="equipmentFilter === 'all' || equipmentFilter === 'engine'">
      <BoatShowEnginesCard
        :boat-id="boat.id"
        :engines="sortEnginesByStatus(boat.engines)"
        :can-manage="canManageEquipment"
        :can-add-task="canManageMaintenance"
        :can-report-incident="canReportIncident"
        @add-task="openTaskModal"
        @report-incident="openIncidentModal"
      />
    </div>

    <!-- Sail cards -->
    <div v-if="equipmentFilter === 'all' || equipmentFilter === 'sail'">
      <BoatShowSailsCard
        :boat-id="boat.id"
        :sails="boat.sails"
        :can-manage="canManageEquipment"
        :can-add-task="canManageMaintenance"
        :can-report-incident="canReportIncident"
        @add-task="openTaskModal"
        @report-incident="openIncidentModal"
      />
    </div>

    <!-- Rig card -->
    <div v-if="equipmentFilter === 'all' || equipmentFilter === 'rig'">
      <BoatShowRigCard
        :boat-id="boat.id"
        :rig="boat.rig"
        :can-manage="canManageEquipment"
        :can-add-task="canManageMaintenance"
        :can-report-incident="canReportIncident"
        @add-task="openTaskModal"
        @report-incident="openIncidentModal"
      />
    </div>

    <!-- Safety compliance + equipment cards -->
    <div v-if="equipmentFilter === 'all' || equipmentFilter === 'safety'" class="space-y-6">
      <BoatSafetyCompliancePanel
        :boat-id="boat.id"
        :report="safetyCompliance"
        :can-manage="canManageEquipment"
        @add-equipment="(type) => (safetyPrefillType = type)"
      />
      <BoatSafetyEquipmentCard
        :boat-id="boat.id"
        :items="boat.safetyEquipment"
        :can-manage="canManageEquipment"
        :can-manage-actions="canManageActions"
        :prefill-equipment-type="safetyPrefillType"
        :can-add-task="canManageMaintenance"
        :can-report-incident="canReportIncident"
        @add-task="openTaskModal"
        @report-incident="openIncidentModal"
        @add-to-actions="openActionModal"
        @prefill-consumed="safetyPrefillType = null"
      />
    </div>

    <!-- Generic equipment card -->
    <div v-if="equipmentFilter === 'all' || equipmentFilter === 'generic'">
      <BoatGenericEquipmentCard
        :boat-id="boat.id"
        :items="boat.genericEquipment"
        :can-manage="canManageEquipment"
        :can-manage-actions="canManageActions"
        :can-add-task="canManageMaintenance"
        :can-report-incident="canReportIncident"
        @add-to-actions="openActionModal"
        @add-task="openTaskModal"
        @report-incident="openIncidentModal"
      />
    </div>
  </div>
</template>
