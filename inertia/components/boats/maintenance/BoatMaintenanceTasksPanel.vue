<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BoatMaintenanceTaskForm from '~/components/boats/maintenance/BoatMaintenanceTaskForm.vue'
import type { BoatCreateIntent, BoatShowDetail, MaintenanceTaskRow } from '~/types/boat_show'
import { useT } from '~/composables/use_t'

const { t } = useT()

const props = withDefaults(
  defineProps<{
    boat: BoatShowDetail
    tasks: MaintenanceTaskRow[]
    canManageMaintenance: boolean
    createIntent?: BoatCreateIntent
  }>(),
  { createIntent: null }
)

const emit = defineEmits<{ createIntentConsumed: [] }>()

// La liste des tâches ouvertes est désormais rendue par les sections groupées de
// l'onglet Tâches (#407) ; ce panneau ne garde que le point d'entrée de création.
const hasOpenTasks = computed(() => props.tasks.some((task) => task.status === 'open'))

const isCreateOpen = ref(false)

// Le panneau est monté après la demande d'ouverture venant de l'en-tête : on
// consomme l'intention au montage plutôt que sur un simple watch (#358).
function consumeCreateIntent() {
  if (props.createIntent !== 'task') return
  if (props.canManageMaintenance) isCreateOpen.value = true
  emit('createIntentConsumed')
}

onMounted(consumeCreateIntent)
watch(() => props.createIntent, consumeCreateIntent)
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

    <div v-if="!hasOpenTasks" class="text-sm text-fg-muted">
      {{ t('boats.maintenance.tasks.empty') }}
    </div>

    <BaseModal
      v-model:open="isCreateOpen"
      :title="t('boats.maintenance.tasks.modalTitle')"
      close-label="Close"
    >
      <BoatMaintenanceTaskForm
        :boat="boat"
        @submitted="isCreateOpen = false"
        @cancel="isCreateOpen = false"
      />
    </BaseModal>
  </div>
</template>
