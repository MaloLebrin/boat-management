<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { computed, onMounted, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import type { BoatCreateIntent, BoatShowDetail, MaintenanceTaskRow } from '~/types/boat_show'
import { engineKindLabel, sailTypeLabel } from '~/utils/boat_enum_labels'
import { useT } from '~/composables/use_t'

const { t } = useT()

type Subject = 'boat' | 'engine' | 'sail' | 'rig'

const props = withDefaults(
  defineProps<{
    boat: BoatShowDetail
    tasks: MaintenanceTaskRow[]
    canManageMaintenance: boolean
    createIntent?: BoatCreateIntent
  }>(),
  { createIntent: null }
)

const emit = defineEmits<{ createIntentConsumed: [] }>()

// La liste des tâches ouvertes est désormais rendue par les sections groupées de
// l'onglet Tâches (#407) ; ce panneau ne garde que le point d'entrée de création.
const hasOpenTasks = computed(() => props.tasks.some((task) => task.status === 'open'))

const isCreateOpen = ref(false)

// form state
const taskSubject = ref<Subject>('boat')
const taskBoatEngineId = ref<string>('')
const taskBoatSailId = ref<string>('')
const taskDueAt = ref('')
const taskRecurrenceMonths = ref('')
const taskDueEngineHours = ref('')
const taskRecurrenceEngineHours = ref('')
const taskTitle = ref('')
const taskNotes = ref('')

const subjectOptions = computed<ReadonlyArray<{ label: string; value: Subject }>>(() => [
  { label: t('boats.maintenance.tasks.wholeBoat'), value: 'boat' },
  { label: t('boats.maintenance.tasks.engine'), value: 'engine' },
  { label: t('boats.maintenance.tasks.sail'), value: 'sail' },
  { label: t('boats.maintenance.tasks.rig'), value: 'rig' },
])

const engineOptions = computed(() =>
  props.boat.engines.map((e) => ({
    value: String(e.id),
    label: `${engineKindLabel(t, e.kind) ?? e.kind} · ${e.brand ?? ''} ${e.model ?? ''}`.trim(),
  }))
)

const sailOptions = computed(() =>
  props.boat.sails.map((s) => ({
    value: String(s.id),
    label: `${sailTypeLabel(t, s.sailType) ?? s.sailType}${s.areaM2 !== null ? ` · ${s.areaM2} m²` : ''}`,
  }))
)

watch(taskSubject, () => {
  taskBoatEngineId.value = ''
  taskBoatSailId.value = ''
  taskDueEngineHours.value = ''
  taskRecurrenceEngineHours.value = ''
  taskTitle.value = ''
  taskNotes.value = ''
})

// Le panneau est monté après la demande d'ouverture venant de l'en-tête : on
// consomme l'intention au montage plutôt que sur un simple watch (#358).
function consumeCreateIntent() {
  if (props.createIntent !== 'task') return
  if (props.canManageMaintenance) isCreateOpen.value = true
  emit('createIntentConsumed')
}

onMounted(consumeCreateIntent)
watch(() => props.createIntent, consumeCreateIntent)
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="space-y-1">
        <p class="text-sm font-semibold text-fg">{{ t('boats.maintenance.tasks.title') }}</p>
        <p class="text-sm text-fg-muted">{{ t('boats.maintenance.tasks.subtitle') }}</p>
      </div>
      <BaseButton
        v-if="canManageMaintenance"
        variant="secondary"
        size="sm"
        type="button"
        :aria-label="t('boats.maintenance.tasks.addTask')"
        @click="isCreateOpen = true"
      >
        {{ t('boats.maintenance.tasks.addTask') }}
      </BaseButton>
    </div>

    <div v-if="!hasOpenTasks" class="text-sm text-fg-muted">
      {{ t('boats.maintenance.tasks.empty') }}
    </div>

    <BaseModal
      v-model:open="isCreateOpen"
      :title="t('boats.maintenance.tasks.modalTitle')"
      close-label="Close"
    >
      <Form
        :action="{ url: `/boats/${boat.id}/maintenance-tasks`, method: 'post' }"
        @success="isCreateOpen = false"
        class="space-y-4"
        #default="{ processing, errors }"
      >
        <BaseSelect
          id="task-subject"
          name="subject"
          :label="t('boats.maintenance.tasks.subject')"
          :options="subjectOptions"
          v-model="taskSubject"
          :errors="errors"
        />

        <template v-if="taskSubject === 'engine'">
          <BaseSelect
            v-if="engineOptions.length"
            id="task-engine"
            name="boatEngineId"
            :label="t('boats.maintenance.tasks.engineLabel')"
            :placeholder="t('boats.maintenance.tasks.selectPlaceholder')"
            :allow-empty="true"
            :options="engineOptions"
            v-model="taskBoatEngineId"
            :errors="errors"
          />

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BaseInput
              id="task-due-hours"
              name="dueEngineHours"
              :label="t('boats.maintenance.tasks.dueEngineHours')"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              v-model="taskDueEngineHours"
              :errors="errors"
            />
            <BaseInput
              id="task-recur-hours"
              name="recurrenceIntervalEngineHours"
              :label="t('boats.maintenance.tasks.recurrenceEngineHours')"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              v-model="taskRecurrenceEngineHours"
              :errors="errors"
            />
          </div>
        </template>

        <template v-if="taskSubject === 'sail'">
          <BaseSelect
            v-if="sailOptions.length"
            id="task-sail"
            name="boatSailId"
            :label="t('boats.maintenance.tasks.sailLabel')"
            :placeholder="t('boats.maintenance.tasks.selectPlaceholder')"
            :allow-empty="true"
            :options="sailOptions"
            v-model="taskBoatSailId"
            :errors="errors"
          />
        </template>

        <template v-if="taskSubject === 'rig'">
          <input v-if="boat.rig" type="hidden" name="boatRigId" :value="boat.rig.id" />
          <p v-if="!boat.rig" class="text-sm text-warning">
            {{ t('boats.maintenance.tasks.noRig') }}
          </p>
          <p v-if="errors.boatRigId" class="mt-1 text-xs font-medium text-danger">
            {{ errors.boatRigId }}
          </p>
        </template>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseInput
            id="task-due-at"
            name="dueAt"
            :label="t('boats.maintenance.tasks.dueDate')"
            type="date"
            v-model="taskDueAt"
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
            v-model="taskRecurrenceMonths"
            :errors="errors"
          />
        </div>

        <BaseInput
          id="task-title"
          name="title"
          :label="t('boats.maintenance.tasks.titleField')"
          required
          :placeholder="t('boats.maintenance.tasks.titlePlaceholder')"
          v-model="taskTitle"
          :errors="errors"
        />

        <BaseTextarea
          id="task-notes"
          name="notes"
          :label="t('boats.maintenance.tasks.notes')"
          :rows="3"
          v-model="taskNotes"
          :errors="errors"
        />

        <div class="flex items-center justify-end gap-2 pt-2">
          <BaseButton variant="ghost" type="button" @click="isCreateOpen = false">{{
            t('boats.maintenance.tasks.cancel')
          }}</BaseButton>
          <BaseButton type="submit" :disabled="processing || (taskSubject === 'rig' && !boat.rig)">
            {{ t('boats.maintenance.tasks.createTask') }}
          </BaseButton>
        </div>
      </Form>
    </BaseModal>
  </div>
</template>
