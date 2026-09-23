<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BoatEquipmentActionModal from '~/components/boats/equipment-actions/BoatEquipmentActionModal.vue'
import BoatIncidentCard from '~/components/boats/incidents/BoatIncidentCard.vue'
import BoatIncidentModal from '~/components/boats/incidents/BoatIncidentModal.vue'
import BoatMaintenanceTaskModal from '~/components/boats/maintenance/BoatMaintenanceTaskModal.vue'
import { useT } from '~/composables/use_t'
import type {
  BoatCreateIntent,
  BoatEquipmentActionRow,
  BoatIncidentRow,
  BoatShowDetail,
  EquipmentActionPrefill,
  MaintenanceTaskRow,
} from '~/types/boat_show'
import type { TaskFormPrefill } from '#shared/types/maintenance'
import { confirmDelete } from '~/utils/native_dialog'
import { countFollowUps, type IncidentTaskPrefill } from '~/utils/incident_follow_ups'

const props = withDefaults(
  defineProps<{
    boat: BoatShowDetail
    incidents: BoatIncidentRow[]
    /** `incidents.create` — bouton « Déclarer » et intention d'ouverture (#816). */
    canCreate: boolean
    /** `incidents.edit` — bouton « Modifier » de chaque carte (#816). */
    canEdit: boolean
    /** `incidents.delete` — réservé aux admins. */
    canDelete: boolean
    /** `maintenance.create` — « Créer une tâche » depuis une carte (#815). */
    canCreateTask?: boolean
    /** `equipmentActions.create` — « Action à réparer » depuis une carte (#815). */
    canCreateAction?: boolean
    /**
     * Tâches et actions du bateau (groupe différé `maintenance`, distinct du
     * groupe `navigation` des incidents) : `undefined` tant qu'elles ne sont
     * pas arrivées, et le badge « n suites » attend plutôt que d'afficher 0.
     */
    maintenanceTasks?: MaintenanceTaskRow[]
    equipmentActions?: BoatEquipmentActionRow[]
    createIntent?: BoatCreateIntent
  }>(),
  {
    createIntent: null,
    canCreateTask: false,
    canCreateAction: false,
    maintenanceTasks: undefined,
    equipmentActions: undefined,
  }
)

const emit = defineEmits<{ createIntentConsumed: [] }>()

const { t } = useT()

const isModalOpen = ref(false)
const editingIncident = ref<BoatIncidentRow | null>(null)

// L'onglet est monté après la demande d'ouverture (prop différée) : on consomme
// l'intention au montage, et si elle change alors que l'onglet est affiché (#365).
function consumeCreateIntent() {
  if (props.createIntent !== 'incident') return
  if (props.canCreate) openCreate()
  emit('createIntentConsumed')
}

onMounted(consumeCreateIntent)
watch(() => props.createIntent, consumeCreateIntent)

function openCreate() {
  editingIncident.value = null
  isModalOpen.value = true
}

function openEdit(incident: BoatIncidentRow) {
  editingIncident.value = incident
  isModalOpen.value = true
}

function deleteIncident(incidentId: number) {
  confirmDelete(
    t('incidents.form.confirmDelete'),
    `/boats/${props.boat.id}/incidents/${incidentId}`,
    { preserveScroll: true }
  )
}

// Suites d'un incident (#815) : une seule modale de tâche et une seule modale
// d'action pour toutes les cartes, semées par la carte qui les ouvre.
const isTaskModalOpen = ref(false)
const taskPrefill = ref<TaskFormPrefill | null>(null)
const taskLockEquipment = ref(false)

function openTaskModal(payload: IncidentTaskPrefill) {
  taskPrefill.value = payload.prefill
  taskLockEquipment.value = payload.lockEquipment
  isTaskModalOpen.value = true
}

const isActionModalOpen = ref(false)
const actionPrefill = ref<EquipmentActionPrefill | null>(null)

function openActionModal(payload: EquipmentActionPrefill) {
  actionPrefill.value = payload
  isActionModalOpen.value = true
}

const followUpCounts = computed(() => {
  const tasks = props.maintenanceTasks
  const actions = props.equipmentActions
  if (tasks === undefined || actions === undefined) return null
  return new Map(props.incidents.map((i) => [i.id, countFollowUps(i.id, tasks, actions)]))
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-fg-muted">
        {{ t('incidents.count', { count: String(incidents.length) }) }}
      </p>
      <BaseButton v-if="canCreate" variant="primary" size="sm" type="button" @click="openCreate">
        {{ t('incidents.addIncident') }}
      </BaseButton>
    </div>

    <!-- Create / Edit modal — `boat` est structurellement une TaskEquipmentSource -->
    <BoatIncidentModal
      v-if="canCreate || canEdit"
      v-model:open="isModalOpen"
      :boat-id="boat.id"
      :equipment="boat"
      :editing-incident="editingIncident"
    />

    <!-- Suites (#815) : tâche ou action pré-remplies depuis une carte -->
    <BoatMaintenanceTaskModal
      v-if="canCreateTask"
      v-model:open="isTaskModalOpen"
      :boat-id="boat.id"
      :equipment="boat"
      :prefill="taskPrefill"
      :lock-equipment="taskLockEquipment"
    />
    <BoatEquipmentActionModal
      v-if="canCreateAction"
      v-model:open="isActionModalOpen"
      :boat="boat"
      :editing-action="null"
      :prefill="actionPrefill"
    />

    <!-- Incidents list -->
    <div v-if="incidents.length > 0" class="space-y-3">
      <BoatIncidentCard
        v-for="incident in incidents"
        :key="incident.id"
        :boat-id="boat.id"
        :incident="incident"
        :can-edit="canEdit"
        :can-delete="canDelete"
        :can-create-task="canCreateTask"
        :can-create-action="canCreateAction"
        :follow-up-count="followUpCounts?.get(incident.id) ?? null"
        @edit="openEdit"
        @delete="deleteIncident"
        @create-task="openTaskModal"
        @create-action="openActionModal"
      />
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="rounded-lg border border-dashed border-border bg-surface-muted/30 p-8 text-center"
    >
      <p class="text-fg-muted">{{ t('incidents.empty') }}</p>
      <BaseButton
        v-if="canCreate"
        variant="secondary"
        size="sm"
        type="button"
        class="mt-4"
        @click="openCreate"
      >
        {{ t('incidents.addIncident') }}
      </BaseButton>
    </div>
  </div>
</template>
