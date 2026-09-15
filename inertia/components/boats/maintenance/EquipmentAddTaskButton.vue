<script setup lang="ts">
import { ClipboardDocumentCheckIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import type { TaskEquipmentRef } from '#shared/types/maintenance'

/** Raccourci « + Tâche » posé sur une carte d'équipement de l'onglet Équipements. */
const props = defineProps<{ equipment: TaskEquipmentRef }>()

const emit = defineEmits<{ (e: 'addTask', equipment: TaskEquipmentRef): void }>()

const { t } = useT()
</script>

<template>
  <BaseButton
    variant="ghost"
    size="sm"
    type="button"
    data-testid="equipment-add-task"
    :aria-label="t('boats.maintenance.tasks.addForEquipment')"
    @click="emit('addTask', props.equipment)"
  >
    <ClipboardDocumentCheckIcon class="h-4 w-4" aria-hidden="true" />
    {{ t('boats.maintenance.tasks.addShort') }}
  </BaseButton>
</template>
