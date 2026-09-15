<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BoatMaintenanceTaskModal from '~/components/boats/maintenance/BoatMaintenanceTaskModal.vue'
import BoatTaskActions from '~/components/boats/maintenance/BoatTaskActions.vue'
import MaintenanceTaskQuickAdd from '~/components/boats/maintenance/MaintenanceTaskQuickAdd.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { MaintenanceTaskRow } from '~/types/boat_show'
import type {
  MaintenanceTaskPermissions,
  TaskEquipmentRef,
  TaskEquipmentSource,
} from '#shared/types/maintenance'

/**
 * Tâches d'un équipement, sur sa page de détail : saisie rapide, formulaire
 * complet pré-rempli sur l'équipement, liste des tâches ouvertes et terminées.
 */
const props = defineProps<{
  boatId: number
  equipmentRef: TaskEquipmentRef
  equipment: TaskEquipmentSource
  tasks: MaintenanceTaskRow[]
  permissions: MaintenanceTaskPermissions
}>()

const { t } = useT()
const { formatDate } = useDateFormat()

const isModalOpen = ref(false)

const openTasks = computed(() => props.tasks.filter((task) => task.status === 'open'))
const doneTasks = computed(() => props.tasks.filter((task) => task.status === 'done'))
const todayIso = computed(() => new Date().toISOString().slice(0, 10))

function isOverdue(task: MaintenanceTaskRow) {
  return task.dueAt !== null && task.dueAt <= todayIso.value
}
</script>

<template>
  <BaseCard padded>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-semibold text-fg">{{ t('boats.maintenance.tasks.sectionTitle') }}</p>
        <BaseButton
          v-if="permissions.canCreate"
          variant="secondary"
          size="sm"
          type="button"
          @click="isModalOpen = true"
        >
          {{ t('boats.maintenance.tasks.addTask') }}
        </BaseButton>
      </div>
    </template>

    <div class="space-y-5">
      <MaintenanceTaskQuickAdd
        v-if="permissions.canCreate"
        :boat-id="boatId"
        :equipment="equipmentRef"
      />

      <p v-if="openTasks.length === 0" class="text-sm text-fg-muted">
        {{ t('boats.maintenance.tasks.empty') }}
      </p>

      <ul v-else class="space-y-2" data-testid="equipment-open-tasks">
        <li
          v-for="task in openTasks"
          :key="task.id"
          class="flex flex-col gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="min-w-0">
            <p class="font-semibold text-fg">{{ task.title }}</p>
            <p v-if="task.notes" class="mt-1 text-sm text-fg-muted">{{ task.notes }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <BaseBadge v-if="task.dueAt" :variant="isOverdue(task) ? 'warning' : 'neutral'">
              {{ formatDate(task.dueAt) }}
            </BaseBadge>
            <BaseBadge v-if="task.dueEngineHours !== null" variant="info">
              {{ t('boats.maintenance.tasks.dueHours', { hours: String(task.dueEngineHours) }) }}
            </BaseBadge>
            <BaseBadge v-if="!task.dueAt && task.dueEngineHours === null" variant="empty">
              {{ t('boats.show.tasksFilter.undated') }}
            </BaseBadge>
            <BoatTaskActions
              v-if="permissions.canEdit"
              :boat-id="boatId"
              :task="task"
              done-variant="ghost"
            />
          </div>
        </li>
      </ul>

      <details v-if="doneTasks.length > 0" class="text-sm">
        <summary class="cursor-pointer text-fg-muted">
          {{ t('boats.maintenance.tasks.doneCount', { count: String(doneTasks.length) }) }}
        </summary>
        <ul class="mt-2 space-y-1">
          <li v-for="task in doneTasks" :key="task.id" class="text-fg-subtle line-through">
            {{ task.title }}
          </li>
        </ul>
      </details>
    </div>

    <BoatMaintenanceTaskModal
      v-if="permissions.canCreate"
      v-model:open="isModalOpen"
      :boat-id="boatId"
      :equipment="equipment"
      :prefill="{ equipment: equipmentRef }"
      lock-equipment
    />
  </BaseCard>
</template>
