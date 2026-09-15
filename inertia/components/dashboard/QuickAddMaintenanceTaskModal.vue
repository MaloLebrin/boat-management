<script setup lang="ts">
import { router, useRemember } from '@inertiajs/vue3'
import { computed, type Ref } from 'vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BoatMaintenanceTaskForm from '~/components/boats/maintenance/BoatMaintenanceTaskForm.vue'
import { useT } from '~/composables/use_t'
import type { BoatTaskEquipment } from '#shared/types/maintenance'
import type { FleetBoatOption } from '#shared/types/navigation'

/**
 * Ajout rapide d'une tâche depuis le tableau de bord : choix du bateau, puis
 * chargement de ses équipements par rechargement partiel (`taskEquipment`).
 *
 * L'état (ouverture, bateau choisi) vit dans `useRemember` : il survit au
 * rechargement partiel, mais pas à la visite qui suit l'enregistrement.
 */
const props = defineProps<{
  boats: FleetBoatOption[]
  taskEquipment?: BoatTaskEquipment
}>()

const { t } = useT()

interface QuickAddTaskState {
  open: boolean
  boatId: string
}

const state = useRemember<QuickAddTaskState>(
  { open: false, boatId: '' },
  'dashboard-quick-add-task'
) as Ref<QuickAddTaskState>

const open = computed({
  get: () => state.value.open,
  set: (value: boolean) => {
    state.value = { open: value, boatId: value ? state.value.boatId : '' }
  },
})

const boatOptions = computed(() => props.boats.map((b) => ({ label: b.name, value: String(b.id) })))

const selectedBoatId = computed({
  get: () => state.value.boatId,
  set: (boatId: string) => {
    state.value = { ...state.value, boatId }
    if (boatId === '') return
    router.reload({ only: ['taskEquipment'], data: { taskBoatId: boatId } })
  },
})

/** Les équipements chargés ne valent que pour le bateau actuellement choisi. */
const loadedEquipment = computed(() => {
  const loaded = props.taskEquipment
  if (!loaded || loaded.boatId === null) return null
  return String(loaded.boatId) === state.value.boatId ? loaded.equipment : null
})

function openModal() {
  state.value = { open: true, boatId: '' }
}

defineExpose({ openModal })
</script>

<template>
  <BaseModal
    v-model:open="open"
    :title="t('dashboard.quickAdd.taskModalTitle')"
    :close-label="t('common.close')"
  >
    <BaseSelect
      id="quick-add-task-boat"
      v-model="selectedBoatId"
      name="taskBoatId"
      :label="t('dashboard.quickAdd.selectBoat')"
      :placeholder="t('dashboard.quickAdd.selectBoatPlaceholder')"
      :options="boatOptions"
    />

    <BoatMaintenanceTaskForm
      v-if="loadedEquipment"
      :key="selectedBoatId"
      class="mt-4"
      :boat-id="Number(selectedBoatId)"
      :equipment="loadedEquipment"
      @submitted="open = false"
      @cancel="open = false"
    />
  </BaseModal>
</template>
