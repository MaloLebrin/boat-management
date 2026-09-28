<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { PencilSquareIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BoatMaintenanceTaskEditModal from '~/components/boats/maintenance/BoatMaintenanceTaskEditModal.vue'
import MaintenanceTaskPostponeMenu from '~/components/boats/maintenance/MaintenanceTaskPostponeMenu.vue'
import type { MaintenanceTaskRow } from '~/types/boat_show'
import { useT } from '~/composables/use_t'

// Actions de clôture/suppression d'une tâche de maintenance, factorisées pour
// être réutilisées partout où une tâche est listée (sections de l'onglet Tâches,
// panneau de gestion) — un libellé unique « Marquer fait » et un flux identique
// (#407). Quand la tâche est jalonnée en heures moteur, la clôture demande le
// relevé d'heures. Une tâche ouverte se reporte (tâche datée) et se modifie
// (#867) ; une tâche close est de l'historique, sans ces deux actions.
const props = withDefaults(
  defineProps<{
    boatId: number
    task: MaintenanceTaskRow
    doneVariant?: 'secondary' | 'ghost'
  }>(),
  { doneVariant: 'secondary' }
)

const { t } = useT()

const editOpen = ref(false)

// Un ordre de travail chiffré (#868) demande le réalisé à la clôture, face au
// prévu. Les champs restent facultatifs.
const asksActuals = computed(
  () =>
    props.task.status === 'open' &&
    ((props.task.estimatedCost ?? null) !== null ||
      (props.task.estimatedDurationMinutes ?? null) !== null)
)
</script>

<template>
  <div class="flex items-center gap-2">
    <MaintenanceTaskPostponeMenu
      v-if="task.status === 'open' && task.dueAt"
      :boat-id="props.boatId"
      :task-id="task.id"
      :due-at="task.dueAt"
    />

    <Form
      :action="{ url: `/boats/${props.boatId}/maintenance-tasks/${task.id}/done`, method: 'put' }"
      class="flex items-center gap-2"
      #default="{ processing }"
    >
      <div v-if="task.dueEngineHours !== null" class="w-36">
        <BaseInput
          :id="`doneEngineHours-${task.id}`"
          name="doneEngineHours"
          type="number"
          inputmode="numeric"
          min="0"
          step="1"
          required
          :placeholder="t('boats.maintenance.tasks.doneHoursPlaceholder')"
        />
      </div>
      <template v-if="asksActuals">
        <div class="w-28">
          <BaseInput
            :id="`actualCost-${task.id}`"
            name="actualCost"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            :aria-label="t('boats.maintenance.tasks.workOrder.actualCost')"
            :placeholder="t('boats.maintenance.tasks.workOrder.actualCostPlaceholder')"
          />
        </div>
        <div class="w-28">
          <BaseInput
            :id="`actualDuration-${task.id}`"
            name="actualDurationMinutes"
            type="number"
            inputmode="numeric"
            min="0"
            step="1"
            :aria-label="t('boats.maintenance.tasks.workOrder.actualDuration')"
            :placeholder="t('boats.maintenance.tasks.workOrder.actualDurationPlaceholder')"
          />
        </div>
      </template>
      <BaseButton type="submit" :variant="doneVariant" size="sm" :disabled="processing">
        {{ t('boats.maintenance.tasks.markDone') }}
      </BaseButton>
    </Form>

    <BaseButton
      v-if="task.status === 'open'"
      type="button"
      variant="ghost"
      size="sm"
      :aria-label="t('boats.maintenance.tasks.edit.open')"
      @click="editOpen = true"
    >
      <PencilSquareIcon class="w-4 h-4" />
    </BaseButton>

    <Form
      :action="{ url: `/boats/${props.boatId}/maintenance-tasks/${task.id}`, method: 'delete' }"
      #default="{ processing }"
    >
      <BaseButton
        type="submit"
        variant="danger"
        size="sm"
        :disabled="processing"
        :aria-label="t('boats.maintenance.tasks.delete')"
      >
        <TrashIcon class="w-4 h-4 text-danger-strong" />
      </BaseButton>
    </Form>

    <BoatMaintenanceTaskEditModal
      v-if="task.status === 'open'"
      v-model:open="editOpen"
      :boat-id="props.boatId"
      :task="task"
    />
  </div>
</template>
