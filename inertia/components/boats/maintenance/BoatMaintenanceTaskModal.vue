<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BoatMaintenanceTaskForm from '~/components/boats/maintenance/BoatMaintenanceTaskForm.vue'
import { useT } from '~/composables/use_t'
import type { TaskEquipmentSource, TaskFormPrefill } from '#shared/types/maintenance'

/**
 * Modale d'ajout de tâche partagée par tous les points d'entrée. Le formulaire
 * est remonté à chaque ouverture et pour chaque équipement (`:key`), pour que le
 * pré-remplissage reparte toujours d'un état vierge.
 */
const props = withDefaults(
  defineProps<{
    boatId: number
    equipment: TaskEquipmentSource
    prefill?: TaskFormPrefill | null
    lockEquipment?: boolean
  }>(),
  { prefill: null, lockEquipment: false }
)

const open = defineModel<boolean>('open', { required: true })

const { t } = useT()

const formKey = computed(() => {
  const ref = props.prefill?.equipment
  return `${props.boatId}-${ref ? `${ref.type}-${ref.id}` : 'boat'}`
})
</script>

<template>
  <BaseModal
    v-model:open="open"
    :title="t('boats.maintenance.tasks.modalTitle')"
    :close-label="t('common.close')"
  >
    <BoatMaintenanceTaskForm
      v-if="open"
      :key="formKey"
      :boat-id="boatId"
      :equipment="equipment"
      :prefill="prefill"
      :lock-equipment="lockEquipment"
      @submitted="open = false"
      @cancel="open = false"
    />
  </BaseModal>
</template>
