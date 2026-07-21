<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { TrashIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import type { MaintenanceTaskRow } from '~/types/boat_show'
import { useT } from '~/composables/use_t'

// Actions de clôture/suppression d'une tâche de maintenance, factorisées pour
// être réutilisées partout où une tâche est listée (sections de l'onglet Tâches,
// panneau de gestion) — un libellé unique « Marquer fait » et un flux identique
// (#407). Quand la tâche est jalonnée en heures moteur, la clôture demande le
// relevé d'heures.
const props = withDefaults(
  defineProps<{
    boatId: number
    task: MaintenanceTaskRow
    doneVariant?: 'secondary' | 'ghost'
  }>(),
  { doneVariant: 'secondary' }
)

const { t } = useT()
</script>

<template>
  <div class="flex items-center gap-2">
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
      <BaseButton type="submit" :variant="doneVariant" size="sm" :disabled="processing">
        {{ t('boats.maintenance.tasks.markDone') }}
      </BaseButton>
    </Form>

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
        <TrashIcon class="w-4 h-4 text-red-800" />
      </BaseButton>
    </Form>
  </div>
</template>
