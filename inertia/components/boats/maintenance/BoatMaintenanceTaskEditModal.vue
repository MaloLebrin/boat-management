<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'
import type { MaintenanceTaskRow } from '~/types/boat_show'

/**
 * Modification d'une tâche planifiée (#867). Le sujet et l'équipement visé ne
 * se modifient pas — changer de cible, c'est une autre tâche. Les champs vides
 * sont envoyés vides : le serveur les vide (échéance retirée, récurrence
 * arrêtée). Les heures moteur ne s'affichent que sur une tâche moteur, la seule
 * à pouvoir en porter.
 */
const props = defineProps<{
  boatId: number
  task: MaintenanceTaskRow
}>()

const open = defineModel<boolean>('open', { required: true })

const { t } = useT()

const isEngineTask = props.task.subject === 'engine' && props.task.boatEngineId !== null

function asInput(value: number | null): string {
  return value === null ? '' : String(value)
}

const title = ref('')
const dueAt = ref('')
const recurrenceMonths = ref('')
const dueEngineHours = ref('')
const recurrenceEngineHours = ref('')
const notes = ref('')

// Chaque ouverture repart de la tâche telle que le serveur la connaît.
watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    title.value = props.task.title
    dueAt.value = props.task.dueAt ?? ''
    recurrenceMonths.value = asInput(props.task.recurrenceIntervalMonths)
    dueEngineHours.value = asInput(props.task.dueEngineHours)
    recurrenceEngineHours.value = asInput(props.task.recurrenceIntervalEngineHours)
    notes.value = props.task.notes ?? ''
  },
  { immediate: true }
)
</script>

<template>
  <BaseModal
    v-model:open="open"
    :title="t('boats.maintenance.tasks.edit.title')"
    :close-label="t('common.close')"
  >
    <Form
      v-if="open"
      :action="{ url: `/boats/${boatId}/maintenance-tasks/${task.id}`, method: 'patch' }"
      :options="{ preserveScroll: true }"
      class="space-y-4"
      #default="{ processing, errors }"
      @success="open = false"
    >
      <BaseInput
        :id="`task-edit-title-${task.id}`"
        name="title"
        :label="t('boats.maintenance.tasks.titleField')"
        v-model="title"
        required
        :errors="errors"
      />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput
          :id="`task-edit-due-at-${task.id}`"
          name="dueAt"
          :label="t('boats.maintenance.tasks.dueDate')"
          type="date"
          v-model="dueAt"
          :errors="errors"
        />
        <BaseInput
          :id="`task-edit-recur-months-${task.id}`"
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

      <div v-if="isEngineTask" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput
          :id="`task-edit-due-hours-${task.id}`"
          name="dueEngineHours"
          :label="t('boats.maintenance.tasks.dueEngineHours')"
          type="number"
          inputmode="numeric"
          min="0"
          step="1"
          v-model="dueEngineHours"
          :errors="errors"
        />
        <BaseInput
          :id="`task-edit-recur-hours-${task.id}`"
          name="recurrenceIntervalEngineHours"
          :label="t('boats.maintenance.tasks.recurrenceEngineHours')"
          type="number"
          inputmode="numeric"
          min="0"
          step="1"
          v-model="recurrenceEngineHours"
          :errors="errors"
        />
      </div>

      <p
        v-if="task.recurrenceIntervalMonths || task.recurrenceIntervalEngineHours"
        class="text-xs text-fg-muted"
      >
        {{ t('boats.maintenance.tasks.edit.recurrenceHint') }}
      </p>

      <BaseTextarea
        :id="`task-edit-notes-${task.id}`"
        name="notes"
        :label="t('boats.maintenance.tasks.notes')"
        :rows="3"
        v-model="notes"
        :errors="errors"
      />

      <div class="flex items-center justify-end gap-2 pt-2">
        <BaseButton variant="ghost" type="button" @click="open = false">
          {{ t('boats.maintenance.tasks.cancel') }}
        </BaseButton>
        <BaseButton type="submit" :disabled="processing">
          {{ t('boats.maintenance.tasks.edit.submit') }}
        </BaseButton>
      </div>
    </Form>
  </BaseModal>
</template>
