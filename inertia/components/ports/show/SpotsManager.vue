<script setup lang="ts">
import { ref } from 'vue'
import { router } from '@inertiajs/vue3'
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import SpotFormModal from '~/components/ports/modals/SpotFormModal.vue'
import { useT } from '~/composables/use_t'
import { routes } from '~/utils/routes'
import type { SpotRow } from '~/types/port'

const props = defineProps<{
  portId: number
  pontoonId?: number | null
  mouillageId?: number | null
  spots: SpotRow[]
}>()

const { t } = useT()

const showSpotModal = ref(false)
const editingSpot = ref<{ id: number; name: string; description: string | null } | null>(null)
const showDeleteConfirm = ref(false)
const spotToDelete = ref<SpotRow | null>(null)

function handleAddSpot() {
  editingSpot.value = null
  showSpotModal.value = true
}

function handleEditSpot(spot: SpotRow) {
  editingSpot.value = { id: spot.id, name: spot.name, description: spot.description }
  showSpotModal.value = true
}

function handleDeleteSpot(spot: SpotRow) {
  spotToDelete.value = spot
  showDeleteConfirm.value = true
}

function confirmDeleteSpot() {
  if (!spotToDelete.value) return
  router.delete(routes.spots.destroy(spotToDelete.value.id))
  spotToDelete.value = null
}

function handleModalClose(open: boolean) {
  showSpotModal.value = open
  if (!open) editingSpot.value = null
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-fg">{{ t('ports.spots.title') }}</h3>
      <BaseButton size="sm" variant="secondary" @click="handleAddSpot">
        <PlusIcon class="h-4 w-4" />
        {{ t('ports.spots.add') }}
      </BaseButton>
    </div>

    <div v-if="spots.length === 0" class="text-sm text-fg-muted py-4 text-center">
      {{ t('ports.spots.empty') }}
    </div>

    <ul v-else class="divide-y divide-border">
      <li v-for="spot in spots" :key="spot.id" class="flex items-center justify-between py-2">
        <div class="flex-1 min-w-0">
          <p class="font-medium text-fg truncate">{{ spot.name }}</p>
          <p v-if="spot.boat" class="text-xs text-fg-muted">
            {{ t('ports.spots.occupiedBy', { name: spot.boat.name }) }}
          </p>
          <p v-else class="text-xs text-fg-subtle">{{ t('ports.spots.free') }}</p>
        </div>
        <div class="flex items-center gap-1 ml-2">
          <BaseButton variant="ghost" size="sm" @click="handleEditSpot(spot)">
            <PencilIcon class="h-4 w-4" />
            <span class="sr-only">{{ t('common.edit') }}</span>
          </BaseButton>
          <BaseButton variant="ghost" size="sm" @click="handleDeleteSpot(spot)">
            <TrashIcon class="h-4 w-4 text-danger" />
            <span class="sr-only">{{ t('common.delete') }}</span>
          </BaseButton>
        </div>
      </li>
    </ul>

    <SpotFormModal
      :open="showSpotModal"
      :port-id="portId"
      :pontoon-id="pontoonId"
      :mouillage-id="mouillageId"
      :spot="editingSpot"
      @update:open="handleModalClose"
    />

    <BaseConfirmModal
      :open="showDeleteConfirm"
      :title="t('ports.spots.deleteConfirm')"
      @update:open="showDeleteConfirm = $event"
      @confirm="confirmDeleteSpot"
    />
  </div>
</template>
