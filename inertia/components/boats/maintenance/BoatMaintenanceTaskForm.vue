<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCombobox from '~/components/base/BaseCombobox.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import MaintenanceTaskSubjectFields from '~/components/boats/maintenance/MaintenanceTaskSubjectFields.vue'
import { useMaintenanceTaskForm } from '~/composables/use_maintenance_task_form'
import { useT } from '~/composables/use_t'
import type { TaskEquipmentSource, TaskFormPrefill } from '#shared/types/maintenance'

/**
 * Formulaire de création d'une tâche de maintenance. L'échéance est facultative :
 * sans date ni heures moteur, la tâche est une simple chose à faire.
 *
 * Réutilisable depuis tout point d'entrée : fiche bateau, page équipement,
 * carte de l'onglet Équipements ou dashboard. `prefill` + `lockEquipment` figent
 * l'équipement visé ; le retour se fait sur la page d'origine (redirect back).
 * Depuis une carte d'incident (#815), `prefill.boatIncidentId` trace l'origine
 * en champ caché.
 */
const props = withDefaults(
  defineProps<{
    boatId: number
    equipment: TaskEquipmentSource
    prefill?: TaskFormPrefill | null
    lockEquipment?: boolean
  }>(),
  { prefill: null, lockEquipment: false }
)

const emit = defineEmits<{ (e: 'submitted'): void; (e: 'cancel'): void }>()

const { t } = useT()

const form = useMaintenanceTaskForm({
  equipment: () => props.equipment,
  prefill: props.prefill,
  lockEquipment: props.lockEquipment,
})
const {
  subject,
  engineId,
  sailId,
  safetyId,
  genericId,
  dueAt,
  recurrenceMonths,
  dueEngineHours,
  recurrenceEngineHours,
  title,
  notes,
  operationOptions,
  onOperationSelected,
} = form

const lockedEquipment = props.lockEquipment ? (props.prefill?.equipment ?? null) : null
</script>

<template>
  <Form
    :action="{ url: `/boats/${boatId}/maintenance-tasks`, method: 'post' }"
    :options="{ preserveScroll: true }"
    @success="emit('submitted')"
    class="space-y-4"
    #default="{ processing, errors }"
  >
    <input
      v-if="prefill?.boatIncidentId"
      type="hidden"
      name="boatIncidentId"
      :value="prefill.boatIncidentId"
    />

    <MaintenanceTaskSubjectFields
      :equipment="equipment"
      :errors="errors"
      :locked-equipment="lockedEquipment"
      v-model:subject="subject"
      v-model:engine-id="engineId"
      v-model:sail-id="sailId"
      v-model:safety-id="safetyId"
      v-model:generic-id="genericId"
      v-model:due-engine-hours="dueEngineHours"
      v-model:recurrence-engine-hours="recurrenceEngineHours"
    />

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BaseInput
        id="task-due-at"
        name="dueAt"
        :label="t('boats.maintenance.tasks.dueDate')"
        type="date"
        v-model="dueAt"
        :errors="errors"
      />
      <BaseInput
        id="task-recur-months"
        name="recurrenceIntervalMonths"
        :label="t('boats.maintenance.tasks.recurrenceMonths')"
        type="number"
        inputmode="numeric"
        min="0"
        step="1"
        v-model="recurrenceMonths"
        :errors="errors"
      />
    </div>

    <BaseCombobox
      id="task-title"
      name="title"
      :label="t('boats.maintenance.tasks.titleField')"
      required
      :placeholder="t('boats.maintenance.operations.placeholder')"
      :hint="t('boats.maintenance.operations.hint')"
      :empty-label="t('boats.maintenance.operations.noMatch')"
      :options="operationOptions"
      v-model="title"
      :errors="errors"
      @select="onOperationSelected"
    />

    <BaseTextarea
      id="task-notes"
      name="notes"
      :label="t('boats.maintenance.tasks.notes')"
      :rows="3"
      v-model="notes"
      :errors="errors"
    />

    <div class="flex items-center justify-end gap-2 pt-2">
      <BaseButton variant="ghost" type="button" @click="emit('cancel')">
        {{ t('boats.maintenance.tasks.cancel') }}
      </BaseButton>
      <BaseButton type="submit" :disabled="processing || (subject === 'rig' && !equipment.rig)">
        {{ t('boats.maintenance.tasks.createTask') }}
      </BaseButton>
    </div>
  </Form>
</template>
