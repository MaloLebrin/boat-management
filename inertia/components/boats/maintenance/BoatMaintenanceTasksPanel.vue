<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { computed, ref, watch } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import type { BoatShowDetail, MaintenanceTaskRow } from '~/types/boat_show'
import { subjectLabel } from './utils'

type Subject = 'boat' | 'engine' | 'sail' | 'rig'

const props = defineProps<{
  boat: BoatShowDetail
  tasks: MaintenanceTaskRow[]
  canManageMaintenance: boolean
  createTaskNonce?: number
}>()

const todayIso = computed(() => new Date().toISOString().slice(0, 10))

const openTasks = computed(() => {
  const tasks = props.tasks.filter((t) => t.status === 'open')
  tasks.sort((a, b) => {
    const ad = a.dueAt ? String(a.dueAt) : null
    const bd = b.dueAt ? String(b.dueAt) : null
    if (ad && bd) return ad.localeCompare(bd)
    if (ad && !bd) return -1
    if (!ad && bd) return 1
    return a.id - b.id
  })
  return tasks
})

function urgencyVariant(t: MaintenanceTaskRow) {
  if (t.dueAt && String(t.dueAt) <= todayIso.value) return 'warning'
  return 'neutral'
}

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

const subjectOptions: ReadonlyArray<{ label: string; value: Subject }> = [
  { label: 'Whole boat', value: 'boat' },
  { label: 'Engine', value: 'engine' },
  { label: 'Sail', value: 'sail' },
  { label: 'Rig', value: 'rig' },
]

const engineOptions = computed(() =>
  props.boat.engines.map((e) => ({
    value: String(e.id),
    label: `${e.kind} · ${e.brand ?? ''} ${e.model ?? ''}`.trim(),
  }))
)

const sailOptions = computed(() =>
  props.boat.sails.map((s) => ({
    value: String(s.id),
    label: `${s.sailType}${s.areaM2 !== null ? ` · ${s.areaM2} m²` : ''}`,
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

watch(
  () => props.createTaskNonce,
  (v) => {
    if (!v) return
    if (!props.canManageMaintenance) return
    isCreateOpen.value = true
  }
)
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="space-y-1">
        <p class="text-sm font-semibold text-fg">Planned maintenance</p>
        <p class="text-sm text-fg-muted">Open tasks (date-based and engine-hour based).</p>
      </div>
      <BaseButton
        v-if="canManageMaintenance"
        variant="secondary"
        size="sm"
        type="button"
        aria-label="Add a maintenance task"
        @click="isCreateOpen = true"
      >
        Add task
      </BaseButton>
    </div>

    <div v-if="openTasks.length === 0" class="text-sm text-fg-muted">No planned tasks.</div>
    <ul v-else class="space-y-3">
      <li
        v-for="t in openTasks"
        :key="t.id"
        class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-3 text-sm"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-semibold text-fg">{{ t.title }}</p>
              <BaseBadge :variant="urgencyVariant(t)">
                {{ t.dueAt && String(t.dueAt) <= todayIso ? 'Urgent' : 'Open' }}
              </BaseBadge>
            </div>
            <p class="text-fg-muted">{{ subjectLabel(t.subject) }}</p>
            <p v-if="t.dueAt" class="mt-1 text-xs text-fg-subtle">Due {{ t.dueAt }}</p>
            <p v-else-if="t.dueEngineHours !== null" class="mt-1 text-xs text-fg-subtle">
              Due at {{ t.dueEngineHours }}h
            </p>
            <p v-if="t.notes" class="mt-2 text-fg-muted">{{ t.notes }}</p>
          </div>

          <div v-if="canManageMaintenance" class="flex items-center gap-3">
            <Form
              v-if="t.dueEngineHours !== null"
              :action="{ url: `/boats/${boat.id}/maintenance-tasks/${t.id}/done`, method: 'put' }"
              class="flex items-center gap-2"
              #default="{ processing }"
            >
              <div class="w-36">
                <BaseInput
                  id="doneEngineHours"
                  name="doneEngineHours"
                  type="number"
                  inputmode="numeric"
                  min="0"
                  step="1"
                  required
                  placeholder="Done @ hours"
                />
              </div>
              <BaseButton type="submit" variant="secondary" size="sm" :disabled="processing">
                Mark done
              </BaseButton>
            </Form>

            <Form
              v-else
              :action="{ url: `/boats/${boat.id}/maintenance-tasks/${t.id}/done`, method: 'put' }"
              #default="{ processing }"
            >
              <BaseButton type="submit" variant="secondary" size="sm" :disabled="processing">
                Mark done
              </BaseButton>
            </Form>

            <Form
              :action="{ url: `/boats/${boat.id}/maintenance-tasks/${t.id}`, method: 'delete' }"
              #default="{ processing }"
            >
              <BaseButton type="submit" variant="danger" size="sm" :disabled="processing">
                Delete
              </BaseButton>
            </Form>
          </div>
        </div>
      </li>
    </ul>

    <BaseModal v-model:open="isCreateOpen" title="Add task" close-label="Close">
      <Form
        :action="{ url: `/boats/${boat.id}/maintenance-tasks`, method: 'post' }"
        class="space-y-4"
        #default="{ processing, errors }"
      >
        <BaseSelect
          id="task-subject"
          name="subject"
          label="Subject"
          :options="subjectOptions"
          v-model="taskSubject"
          :errors="errors"
        />

        <template v-if="taskSubject === 'engine'">
          <BaseSelect
            v-if="engineOptions.length"
            id="task-engine"
            name="boatEngineId"
            label="Engine"
            placeholder="— Select —"
            :allow-empty="true"
            :options="engineOptions"
            v-model="taskBoatEngineId"
            :errors="errors"
          />

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BaseInput
              id="task-due-hours"
              name="dueEngineHours"
              label="Due hours"
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
              label="Recurrence hours"
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
            label="Sail"
            placeholder="— Select —"
            :allow-empty="true"
            :options="sailOptions"
            v-model="taskBoatSailId"
            :errors="errors"
          />
        </template>

        <template v-if="taskSubject === 'rig'">
          <input v-if="boat.rig" type="hidden" name="boatRigId" :value="boat.rig.id" />
          <p v-if="!boat.rig" class="text-sm text-warning">
            Save a rig on this boat before planning rig tasks.
          </p>
          <p v-if="errors.boatRigId" class="mt-1 text-xs font-medium text-danger">
            {{ errors.boatRigId }}
          </p>
        </template>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BaseInput
            id="task-due-at"
            name="dueAt"
            label="Due date (optional)"
            type="date"
            v-model="taskDueAt"
            :errors="errors"
          />
          <BaseInput
            id="task-recur-months"
            name="recurrenceIntervalMonths"
            label="Recurrence months"
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
          label="Title"
          required
          placeholder="e.g. Oil change, inspect rigging"
          v-model="taskTitle"
          :errors="errors"
        />

        <BaseTextarea
          id="task-notes"
          name="notes"
          label="Notes"
          :rows="3"
          v-model="taskNotes"
          :errors="errors"
        />

        <div class="flex items-center justify-end gap-2 pt-2">
          <BaseButton variant="ghost" type="button" @click="isCreateOpen = false">Cancel</BaseButton>
          <BaseButton type="submit" :disabled="processing || (taskSubject === 'rig' && !boat.rig)">
            Create task
          </BaseButton>
        </div>
      </Form>
    </BaseModal>
  </div>
</template>

