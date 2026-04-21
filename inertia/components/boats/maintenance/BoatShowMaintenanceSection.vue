<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { computed, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import type { BoatShowDetail, MaintenanceEventRow, MaintenanceTaskRow } from '~/types/boat_show'

const props = defineProps<{
  boat: BoatShowDetail
  maintenanceEvents: MaintenanceEventRow[]
  maintenanceTasks: MaintenanceTaskRow[]
  canManageMaintenance: boolean
}>()

type Subject = 'boat' | 'engine' | 'sail' | 'rig'

const subject = ref<'boat' | 'engine' | 'sail' | 'rig'>('boat')
const boatEngineId = ref<string>('')
const boatSailId = ref<string>('')
const engineCaptionManual = ref('')
const sailCaptionManual = ref('')
const partRows = ref<Array<{ name: string; quantity: string; notes: string }>>([])
const performedAt = ref('')
const entryTitle = ref('')
const entryNotes = ref('')

// task form
const taskSubject = ref<'boat' | 'engine' | 'sail' | 'rig'>('boat')
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

watch(subject, () => {
  boatEngineId.value = ''
  boatSailId.value = ''
  engineCaptionManual.value = ''
  sailCaptionManual.value = ''
  performedAt.value = ''
  entryTitle.value = ''
  entryNotes.value = ''
  partRows.value = []
})

watch(taskSubject, () => {
  taskBoatEngineId.value = ''
  taskBoatSailId.value = ''
  taskDueEngineHours.value = ''
  taskRecurrenceEngineHours.value = ''
  taskTitle.value = ''
  taskNotes.value = ''
})

function addPartRow() {
  partRows.value.push({ name: '', quantity: '', notes: '' })
}

function removePartRow(index: number) {
  partRows.value.splice(index, 1)
}

function subjectLabel(s: string) {
  switch (s) {
    case 'boat':
      return 'Boat'
    case 'engine':
      return 'Engine'
    case 'sail':
      return 'Sail'
    case 'rig':
      return 'Rig'
    default:
      return s
  }
}

function targetDescription(ev: MaintenanceEventRow) {
  if (ev.subject === 'boat') return 'Whole boat'
  if (ev.subject === 'engine') return ev.engineCaption ?? 'Engine'
  if (ev.subject === 'sail') return ev.sailCaption ?? 'Sail'
  if (ev.subject === 'rig') return 'Rig'
  return '—'
}

function performedDisplay(iso: string) {
  if (!iso) return '—'
  const d = iso.slice(0, 10)
  return d || iso
}

const openTasks = computed(() => props.maintenanceTasks.filter((t) => t.status === 'open'))
</script>

<template>
  <BaseCard padded>
    <template #header>
      <div class="space-y-1">
        <p class="text-sm font-semibold text-fg">Planned maintenance</p>
        <p class="text-sm text-fg-muted">Open tasks (date-based and engine-hour based).</p>
      </div>
    </template>

    <div v-if="openTasks.length === 0" class="text-sm text-fg-muted">No planned tasks.</div>
    <ul v-else class="space-y-3">
      <li v-for="t in openTasks" :key="t.id"
        class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-3 text-sm">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="font-semibold text-fg">{{ t.title }}</p>
            <p class="text-fg-muted">{{ subjectLabel(t.subject) }}</p>
            <p v-if="t.dueAt" class="mt-1 text-xs text-fg-subtle">Due {{ t.dueAt }}</p>
            <p v-else-if="t.dueEngineHours !== null" class="mt-1 text-xs text-fg-subtle">
              Due at {{ t.dueEngineHours }}h
            </p>
            <p v-if="t.notes" class="mt-2 text-fg-muted">{{ t.notes }}</p>
          </div>

          <div v-if="canManageMaintenance" class="flex items-center gap-3">
            <Form v-if="t.dueEngineHours !== null"
              :action="{ url: `/boats/${boat.id}/maintenance-tasks/${t.id}/done`, method: 'put' }"
              class="flex items-center gap-2" #default="{ processing }">
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

            <Form v-else :action="{ url: `/boats/${boat.id}/maintenance-tasks/${t.id}/done`, method: 'put' }"
              #default="{ processing }">
              <BaseButton type="submit" variant="secondary" size="sm" :disabled="processing">
                Mark done
              </BaseButton>
            </Form>

            <Form :action="{ url: `/boats/${boat.id}/maintenance-tasks/${t.id}`, method: 'delete' }"
              #default="{ processing }">
              <BaseButton type="submit" variant="danger" size="sm" :disabled="processing">
                Delete
              </BaseButton>
            </Form>
          </div>
        </div>
      </li>
    </ul>

    <div v-if="canManageMaintenance" class="mt-6 border-t border-border pt-6">
      <p class="text-sm font-semibold text-fg">Add task</p>
      <Form :action="{ url: `/boats/${boat.id}/maintenance-tasks`, method: 'post' }" class="mt-4 space-y-4"
        #default="{ processing, errors }">
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
          <p v-if="!boat.rig" class="text-sm text-warning">Save a rig on this boat before planning rig tasks.</p>
          <p v-if="errors.boatRigId" class="mt-1 text-xs font-medium text-danger">{{ errors.boatRigId }}</p>
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

        <BaseButton type="submit" :disabled="processing || (taskSubject === 'rig' && !boat.rig)">
          Create task
        </BaseButton>
      </Form>
    </div>

    <div class="mt-10 border-t border-border pt-8">
      <p class="text-sm font-semibold text-fg">Maintenance history</p>
      <p class="mt-1 text-sm text-fg-muted">
        Work done on the hull, an engine, a sail, or the rig, with replaced parts.
      </p>

      <div v-if="maintenanceEvents.length === 0" class="mt-4 text-sm text-fg-muted">No entries yet.</div>
      <ul v-else class="mt-4 space-y-4">
        <li v-for="ev in maintenanceEvents" :key="ev.id"
          class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-3 text-sm">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p class="font-semibold text-fg">{{ performedDisplay(ev.performedAt) }} — {{ ev.title }}</p>
              <p class="text-fg-muted">{{ subjectLabel(ev.subject) }} · {{ targetDescription(ev) }}</p>
              <p v-if="ev.notes" class="mt-2 text-fg-muted">{{ ev.notes }}</p>
              <ul v-if="ev.parts.length" class="mt-2 list-inside list-disc text-fg-muted">
                <li v-for="p in ev.parts" :key="p.id">
                  {{ p.name }}<template v-if="p.quantity !== null"> × {{ p.quantity }}</template>
                  <template v-if="p.notes"> — {{ p.notes }}</template>
                </li>
              </ul>
            </div>
            <Form v-if="canManageMaintenance"
              :action="{ url: `/boats/${boat.id}/maintenance/${ev.id}`, method: 'delete' }" #default="{ processing }">
              <BaseButton type="submit" variant="danger" size="sm" :disabled="processing">
                Remove
              </BaseButton>
            </Form>
          </div>
        </li>
      </ul>

      <div v-if="canManageMaintenance" class="mt-6 border-t border-border pt-6">
        <p class="text-sm font-semibold text-fg">Add entry</p>
        <Form :action="{ url: `/boats/${boat.id}/maintenance`, method: 'post' }" class="mt-4 space-y-4"
          #default="{ processing, errors }">
          <BaseSelect
            id="maint-subject"
            name="subject"
            label="Subject"
            :options="subjectOptions"
            v-model="subject"
            :errors="errors"
          />

          <template v-if="subject === 'engine'">
            <BaseSelect
              v-if="engineOptions.length"
              id="maint-engine"
              name="boatEngineId"
              label="Engine"
              placeholder="— Select —"
              :allow-empty="true"
              :options="engineOptions"
              v-model="boatEngineId"
              :errors="errors"
            />

            <BaseInput
              id="maint-engine-caption"
              name="engineCaption"
              label="Label"
              placeholder="e.g. Inboard diesel port"
              v-model="engineCaptionManual"
              :errors="errors"
            />
          </template>

          <template v-if="subject === 'sail'">
            <BaseSelect
              v-if="sailOptions.length"
              id="maint-sail"
              name="boatSailId"
              label="Sail"
              placeholder="— Select —"
              :allow-empty="true"
              :options="sailOptions"
              v-model="boatSailId"
              :errors="errors"
            />

            <BaseInput
              id="maint-sail-caption"
              name="sailCaption"
              label="Label"
              placeholder="e.g. Main — 3 reefs"
              v-model="sailCaptionManual"
              :errors="errors"
            />
          </template>

          <template v-if="subject === 'rig'">
            <input v-if="boat.rig" type="hidden" name="boatRigId" :value="boat.rig.id" />
            <p v-if="!boat.rig" class="text-sm text-warning">Save a rig on this boat before logging rig maintenance.</p>
            <p v-if="errors.boatRigId" class="mt-1 text-xs font-medium text-danger">{{ errors.boatRigId }}</p>
          </template>

          <BaseInput
            id="maint-date"
            name="performedAt"
            label="Date"
            type="date"
            required
            v-model="performedAt"
            :errors="errors"
          />

          <BaseInput
            id="maint-title"
            name="title"
            label="Title"
            required
            placeholder="e.g. Oil change, batten replacement"
            v-model="entryTitle"
            :errors="errors"
          />

          <BaseTextarea
            id="maint-notes"
            name="notes"
            label="Notes"
            :rows="3"
            v-model="entryNotes"
            :errors="errors"
          />

          <div>
            <div class="flex items-center justify-between gap-2">
              <label class="text-sm font-semibold text-fg">Parts replaced (optional)</label>
              <button
                type="button"
                class="text-xs font-semibold text-fg-muted hover:text-fg hover:underline"
                @click="addPartRow"
              >
                + Add part
              </button>
            </div>
            <div v-for="(row, i) in partRows" :key="i"
              class="mt-3 grid grid-cols-1 gap-2 rounded-(--radius-control) border border-border bg-surface-muted/40 p-3 sm:grid-cols-12">
              <div class="sm:col-span-5">
                <BaseInput
                  :id="`part-name-${i}`"
                  :name="`parts[${i}][name]`"
                  placeholder="Part name"
                  v-model="row.name"
                />
              </div>
              <div class="sm:col-span-2">
                <BaseInput
                  :id="`part-qty-${i}`"
                  :name="`parts[${i}][quantity]`"
                  type="number"
                  inputmode="numeric"
                  min="1"
                  step="1"
                  placeholder="Qty"
                  v-model="row.quantity"
                />
              </div>
              <div class="sm:col-span-4">
                <BaseInput
                  :id="`part-notes-${i}`"
                  :name="`parts[${i}][notes]`"
                  placeholder="Notes"
                  v-model="row.notes"
                />
              </div>
              <div class="flex items-center sm:col-span-1">
                <button type="button" class="text-xs text-red-700 hover:underline" @click="removePartRow(i)">
                  Remove
                </button>
              </div>
            </div>
          </div>

          <BaseButton type="submit" :disabled="processing || (subject === 'rig' && !boat.rig)">
            Save entry
          </BaseButton>
        </Form>
      </div>
    </div>
  </BaseCard>
</template>
