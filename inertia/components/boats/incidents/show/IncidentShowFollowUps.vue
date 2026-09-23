<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { ref } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BoatEquipmentActionModal from '~/components/boats/equipment-actions/BoatEquipmentActionModal.vue'
import IncidentFollowUpButtons from '~/components/boats/incidents/IncidentFollowUpButtons.vue'
import BoatMaintenanceTaskModal from '~/components/boats/maintenance/BoatMaintenanceTaskModal.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type {
  BoatEquipmentActionRow,
  BoatIncidentRow,
  EquipmentActionPrefill,
  MaintenanceTaskRow,
} from '~/types/boat_show'
import type { TaskEquipmentSource, TaskFormPrefill } from '#shared/types/maintenance'
import type { IncidentTaskPrefill } from '~/utils/incident_follow_ups'

/**
 * Suites d'un incident sur sa page de détail (#815) : boutons « Créer une
 * tâche » / « Action à réparer » (modales pré-remplies, incident tracé), puis
 * les tâches et actions déjà rattachées. Les listes sont en lecture seule —
 * marquer fait, modifier ou supprimer se fait sur les onglets dédiés.
 */
const props = defineProps<{
  boat: { id: number; name: string }
  incident: BoatIncidentRow
  tasks: MaintenanceTaskRow[]
  actions: BoatEquipmentActionRow[]
  /** Équipements du bateau pour le formulaire de tâche. */
  equipment: TaskEquipmentSource
  canCreateTask: boolean
  canCreateAction: boolean
}>()

const { t } = useT()
const { formatDate } = useDateFormat()

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

const tasksTabHref = `/boats/${props.boat.id}?tab=tasks`
const actionsTabHref = `/boats/${props.boat.id}?tab=equipmentActions`
</script>

<template>
  <BaseCard padded data-testid="incident-follow-ups">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-fg">{{ t('incidents.followUps.title') }}</p>
          <p v-if="canCreateTask || canCreateAction" class="mt-0.5 text-xs text-fg-muted">
            {{ t('incidents.followUps.hint') }}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <IncidentFollowUpButtons
            :incident="incident"
            :can-create-task="canCreateTask"
            :can-create-action="canCreateAction"
            @create-task="openTaskModal"
            @create-action="openActionModal"
          />
        </div>
      </div>
    </template>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
      <!-- Tâches liées -->
      <section data-testid="incident-linked-tasks">
        <div class="mb-2 flex items-center justify-between gap-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-fg-muted">
            {{ t('incidents.followUps.tasksTitle') }}
          </p>
          <Link :href="tasksTabHref" class="text-xs font-medium text-brand hover:underline">
            {{ t('incidents.followUps.seeTasks') }}
          </Link>
        </div>
        <p v-if="tasks.length === 0" class="text-sm text-fg-muted">
          {{ t('incidents.followUps.tasksEmpty') }}
        </p>
        <ul v-else class="space-y-2">
          <li
            v-for="task in tasks"
            :key="task.id"
            class="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-elevated px-3 py-2"
          >
            <div class="min-w-0 flex-1">
              <p
                :class="[
                  'truncate text-sm font-medium',
                  task.status === 'done' ? 'text-fg-subtle line-through' : 'text-fg',
                ]"
              >
                {{ task.title }}
              </p>
              <p v-if="task.dueAt" class="text-xs text-fg-muted">
                {{ t('boats.maintenance.tasks.dueAt', { date: formatDate(task.dueAt) }) }}
              </p>
            </div>
            <BaseBadge :variant="task.status === 'done' ? 'success' : 'warning'">
              {{
                task.status === 'done'
                  ? t('incidents.followUps.taskDone')
                  : t('incidents.followUps.taskOpen')
              }}
            </BaseBadge>
          </li>
        </ul>
      </section>

      <!-- Actions liées -->
      <section data-testid="incident-linked-actions">
        <div class="mb-2 flex items-center justify-between gap-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-fg-muted">
            {{ t('incidents.followUps.actionsTitle') }}
          </p>
          <Link :href="actionsTabHref" class="text-xs font-medium text-brand hover:underline">
            {{ t('incidents.followUps.seeActions') }}
          </Link>
        </div>
        <p v-if="actions.length === 0" class="text-sm text-fg-muted">
          {{ t('incidents.followUps.actionsEmpty') }}
        </p>
        <ul v-else class="space-y-2">
          <li
            v-for="action in actions"
            :key="action.id"
            class="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-elevated px-3 py-2"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-fg">{{ action.label }}</p>
              <p class="text-xs text-fg-muted">
                {{ t(`equipmentActions.actionType.${action.actionType}`) }}
              </p>
            </div>
            <BaseBadge :variant="action.status === 'done' ? 'success' : 'neutral'">
              {{ t(`equipmentActions.status.${action.status}`) }}
            </BaseBadge>
          </li>
        </ul>
      </section>
    </div>

    <BoatMaintenanceTaskModal
      v-if="canCreateTask"
      v-model:open="isTaskModalOpen"
      :boat-id="boat.id"
      :equipment="equipment"
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
  </BaseCard>
</template>
