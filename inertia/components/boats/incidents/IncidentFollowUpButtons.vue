<script setup lang="ts">
import { ClipboardDocumentCheckIcon, WrenchScrewdriverIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import type { BoatIncidentRow, EquipmentActionPrefill } from '~/types/boat_show'
import {
  actionPrefillForIncident,
  taskPrefillForIncident,
  type IncidentTaskPrefill,
} from '~/utils/incident_follow_ups'

/**
 * Boutons « Créer une tâche » / « Action à réparer » d'une carte d'incident
 * (#815). Le composant n'héberge aucune modale : il émet le pré-remplissage
 * (titre depuis le type d'incident, même équipement, incident d'origine) et
 * l'hôte — onglet ou page de détail — ouvre sa modale unique.
 */
const props = withDefaults(
  defineProps<{
    incident: BoatIncidentRow
    /** `maintenance.create` */
    canCreateTask?: boolean
    /** `equipmentActions.create` */
    canCreateAction?: boolean
  }>(),
  { canCreateTask: false, canCreateAction: false }
)

const emit = defineEmits<{
  createTask: [payload: IncidentTaskPrefill]
  createAction: [payload: EquipmentActionPrefill]
}>()

const { t } = useT()

function label() {
  return t(`incidents.type.${props.incident.type}`)
}
</script>

<template>
  <BaseButton
    v-if="canCreateTask"
    type="button"
    variant="ghost"
    size="sm"
    data-testid="incident-create-task"
    @click="emit('createTask', taskPrefillForIncident(incident, label()))"
  >
    <ClipboardDocumentCheckIcon class="h-4 w-4" aria-hidden="true" />
    {{ t('incidents.followUps.createTask') }}
  </BaseButton>
  <BaseButton
    v-if="canCreateAction"
    type="button"
    variant="ghost"
    size="sm"
    data-testid="incident-create-action"
    @click="emit('createAction', actionPrefillForIncident(incident, label()))"
  >
    <WrenchScrewdriverIcon class="h-4 w-4" aria-hidden="true" />
    {{ t('incidents.followUps.createAction') }}
  </BaseButton>
</template>
