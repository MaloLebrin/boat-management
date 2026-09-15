<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { PlusIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'
import { equipmentFieldName } from '#shared/helpers/maintenance_task_equipment'
import type { TaskEquipmentRef } from '#shared/types/maintenance'

/**
 * Saisie rapide d'une tâche : un titre puis Entrée. Pas d'échéance ; le sujet est
 * déduit côté serveur de l'équipement visé (ou `boat` sans équipement). Pour
 * planifier finement (date, récurrence, heures), le formulaire complet reste là.
 */
const props = withDefaults(
  defineProps<{
    boatId: number
    equipment?: TaskEquipmentRef | null
  }>(),
  { equipment: null }
)

const { t } = useT()

const form = useForm({
  title: '',
  ...(props.equipment
    ? { [equipmentFieldName(props.equipment.type)]: String(props.equipment.id) }
    : {}),
})

function submit() {
  if (form.processing || form.title.trim() === '') return
  form.post(`/boats/${props.boatId}/maintenance-tasks`, {
    preserveScroll: true,
    onSuccess: () => form.reset('title'),
  })
}
</script>

<template>
  <form class="flex items-end gap-2" data-testid="task-quick-add" @submit.prevent="submit">
    <div class="min-w-0 flex-1">
      <BaseInput
        :id="`task-quick-add-${equipment ? `${equipment.type}-${equipment.id}` : boatId}`"
        name="title"
        :label="t('boats.maintenance.tasks.quickAddLabel')"
        :placeholder="t('boats.maintenance.tasks.quickAddPlaceholder')"
        :disabled="form.processing"
        :error="form.errors.title"
        v-model="form.title"
      />
    </div>
    <BaseButton
      type="submit"
      variant="secondary"
      size="icon"
      :disabled="form.processing || form.title.trim() === ''"
      :aria-label="t('boats.maintenance.tasks.quickAddSubmit')"
    >
      <PlusIcon class="h-4 w-4" />
    </BaseButton>
  </form>
</template>
