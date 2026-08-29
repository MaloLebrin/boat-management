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
import { shouldReopenEngineForm } from '~/composables/use_engine_form_draft'
import { useT } from '~/composables/use_t'
import type { BoatCreateIntent, BoatShowDetail, EquipmentActionPrefill } from '~/types/boat_show'
import type { SafetyComplianceReport } from '#shared/types/safety'

const props = withDefaults(
  defineProps<{
    boat: BoatShowDetail
    canManageEquipment: boolean
    canManageActions: boolean
    createIntent?: BoatCreateIntent
    /** Rapport de conformité Division 240 (#582), calculé côté serveur. */
    safetyCompliance: SafetyComplianceReport
  }>(),
  { createIntent: null }
)

const emit = defineEmits<{ createIntentConsumed: [] }>()

const { t } = useT()

const equipmentFilter = ref<'all' | 'engine' | 'sail' | 'rig' | 'safety' | 'generic'>('all')
// Rouverte depuis l'URL après la visite partielle du catalogue moteur (#573),
// qui remonte l'arbre et emporterait sinon ce booléen.
const isAddModalOpen = ref(shouldReopenEngineForm('equipment-add'))

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
      />
    </div>

    <!-- Sail cards -->
    <div v-if="equipmentFilter === 'all' || equipmentFilter === 'sail'">
      <BoatShowSailsCard :boat-id="boat.id" :sails="boat.sails" :can-manage="canManageEquipment" />
    </div>

    <!-- Rig card -->
    <div v-if="equipmentFilter === 'all' || equipmentFilter === 'rig'">
      <BoatShowRigCard :boat-id="boat.id" :rig="boat.rig" :can-manage="canManageEquipment" />
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
        @add-to-actions="openActionModal"
      />
    </div>
  </div>
</template>
