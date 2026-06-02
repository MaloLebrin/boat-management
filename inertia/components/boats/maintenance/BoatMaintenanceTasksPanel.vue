<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { TrashIcon } from '@heroicons/vue/24/outline'
import { computed, ref, watch } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import type { BoatShowDetail, MaintenanceTaskRow } from '~/types/boat_show'
import { subjectLabel } from './utils'
import { useT } from '~/composables/use_t'

const { t } = useT()

type Subject = 'boat' | 'engine' | 'sail' | 'rig'

const props = defineProps<{
  boat: BoatShowDetail
  tasks: MaintenanceTaskRow[]
  canManageMaintenance: boolean
  createTaskNonce?: number
}>()

const todayIso = computed(() => new Date().toISOString().slice(0, 10))

const openTasks = computed(() => {
  const tasks = props.tasks.filter((task) => task.status === 'open')
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

function urgencyVariant(task: MaintenanceTaskRow) {
  if (task.dueAt && String(task.dueAt) <= todayIso.value) return 'warning'
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

const subjectOptions = computed<ReadonlyArray<{ label: string; value: Subject }>>(() => [
  { label: t('boats.maintenance.tasks.wholeBoat'), value: 'boat' },
  { label: t('boats.maintenance.tasks.engine'), value: 'engine' },
  { label: t('boats.maintenance.tasks.sail'), value: 'sail' },
  { label: t('boats.maintenance.tasks.rig'), value: 'rig' },
])

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

    <div v-if="openTasks.length === 0" class="text-sm text-fg-muted">
      {{ t('boats.maintenance.tasks.empty') }}
    </div>
    <ul v-else class="space-y-3">
      <li
        v-for="task in openTasks"
        :key="task.id"
        class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-3 text-sm"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-semibold text-fg">{{ task.title }}</p>
              <BaseBadge :variant="urgencyVariant(task)">
                {{
                  task.dueAt && String(task.dueAt) <= todayIso
                    ? t('boats.maintenance.tasks.urgent')
                    : t('boats.maintenance.tasks.open')
                }}
              </BaseBadge>
            </div>
            <p class="text-fg-muted">{{ subjectLabel(task.subject) }}</p>
            <p v-if="task.dueAt" class="mt-1 text-xs text-fg-subtle">
              {{ t('boats.maintenance.tasks.dueAt', { date: task.dueAt }) }}
            </p>
            <p v-else-if="task.dueEngineHours !== null" class="mt-1 text-xs text-fg-subtle">
              {{ t('boats.maintenance.tasks.dueHours', { hours: task.dueEngineHours }) }}
            </p>
            <p v-if="task.notes" class="mt-2 text-fg-muted">{{ task.notes }}</p>
          </div>

          <div v-if="canManageMaintenance" class="flex items-center gap-3">
            <Form
              v-if="task.dueEngineHours !== null"
              :action="{
                url: `/boats/${boat.id}/maintenance-tasks/${task.id}/done`,
                method: 'put',
              }"
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
                  :placeholder="t('boats.maintenance.tasks.doneHoursPlaceholder')"
                />
              </div>
              <BaseButton type="submit" variant="secondary" size="sm" :disabled="processing">
                {{ t('boats.maintenance.tasks.done') }}
              </BaseButton>
            </Form>

            <Form
              v-else
              :action="{
                url: `/boats/${boat.id}/maintenance-tasks/${task.id}/done`,
                method: 'put',
              }"
              #default="{ processing }"
            >
              <BaseButton type="submit" variant="secondary" size="sm" :disabled="processing">
                {{ t('boats.maintenance.tasks.done') }}
              </BaseButton>
            </Form>

            <Form
              :action="{ url: `/boats/${boat.id}/maintenance-tasks/${task.id}`, method: 'delete' }"
              #default="{ processing }"
            >
              <BaseButton type="submit" variant="danger" size="sm" :disabled="processing">
                <TrashIcon class="w-4 h-4 text-red-800" />
              </BaseButton>
            </Form>
          </div>
        </div>
      </li>
    </ul>

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
