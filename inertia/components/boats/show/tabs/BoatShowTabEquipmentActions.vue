<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseSegmentedControl from '~/components/base/BaseSegmentedControl.vue'
import BoatEquipmentActionCard from '~/components/boats/equipment-actions/BoatEquipmentActionCard.vue'
import BoatEquipmentActionModal from '~/components/boats/equipment-actions/BoatEquipmentActionModal.vue'
import { useT } from '~/composables/use_t'
import type {
  BoatEquipmentActionRow,
  BoatShowDetail,
  EquipmentActionStatus,
  EquipmentActionType,
} from '~/types/boat_show'

const props = defineProps<{
  boat: BoatShowDetail
  equipmentActions: BoatEquipmentActionRow[]
  canManage: boolean
  canDelete: boolean
}>()

const { t } = useT()

const showModal = ref(false)
const editingAction = ref<BoatEquipmentActionRow | null>(null)

const statusFilter = ref<EquipmentActionStatus | 'all'>('all')
const typeFilter = ref<EquipmentActionType | 'all'>('all')

const statusOptions = computed(() => [
  { value: 'all' as const, label: t('equipmentActions.filters.allStatuses') },
  { value: 'pending' as const, label: t('equipmentActions.status.pending') },
  { value: 'ordered' as const, label: t('equipmentActions.status.ordered') },
  { value: 'done' as const, label: t('equipmentActions.status.done') },
  { value: 'cancelled' as const, label: t('equipmentActions.status.cancelled') },
])

const typeOptions = computed(() => [
  { value: 'all' as const, label: t('equipmentActions.filters.allTypes') },
  { value: 'to_buy' as const, label: t('equipmentActions.actionType.to_buy') },
  { value: 'to_replace' as const, label: t('equipmentActions.actionType.to_replace') },
  { value: 'to_repair' as const, label: t('equipmentActions.actionType.to_repair') },
])

const filteredActions = computed(() => {
  return props.equipmentActions.filter((action) => {
    if (statusFilter.value !== 'all' && action.status !== statusFilter.value) return false
    if (typeFilter.value !== 'all' && action.actionType !== typeFilter.value) return false
    return true
  })
})

function openCreate() {
  editingAction.value = null
  showModal.value = true
}

function openEdit(action: BoatEquipmentActionRow) {
  editingAction.value = action
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingAction.value = null
}

function deleteAction(id: number) {
  if (!window.confirm(t('equipmentActions.form.confirmDelete'))) return
  router.delete(`/boats/${props.boat.id}/equipment-actions/${id}`, { preserveScroll: true })
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-fg-muted">
        {{ t('equipmentActions.count', { count: String(equipmentActions.length) }) }}
      </p>
      <BaseButton v-if="canManage" variant="primary" size="sm" type="button" @click="openCreate">
        {{ t('equipmentActions.addAction') }}
      </BaseButton>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-4">
      <div>
        <p class="text-xs text-fg-muted mb-2">{{ t('equipmentActions.fields.status') }}</p>
        <BaseSegmentedControl v-model="statusFilter" :options="statusOptions" />
      </div>
      <div>
        <p class="text-xs text-fg-muted mb-2">{{ t('equipmentActions.fields.actionType') }}</p>
        <BaseSegmentedControl v-model="typeFilter" :options="typeOptions" />
      </div>
    </div>

    <!-- Modal -->
    <BoatEquipmentActionModal
      :boat="boat"
      :open="showModal"
      :editing-action="editingAction"
      @update:open="closeModal"
    />

    <!-- Actions list -->
    <div v-if="filteredActions.length > 0" class="space-y-3">
      <BoatEquipmentActionCard
        v-for="action in filteredActions"
        :key="action.id"
        :action="action"
        :can-manage="canManage"
        :can-delete="canDelete"
        @edit="openEdit"
        @delete="deleteAction"
      />
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="rounded-lg border border-dashed border-border bg-surface-muted/30 p-8 text-center"
    >
      <p class="text-fg-muted">{{ t('equipmentActions.empty') }}</p>
      <BaseButton
        v-if="canManage"
        variant="secondary"
        size="sm"
        type="button"
        class="mt-4"
        @click="openCreate"
      >
        {{ t('equipmentActions.addAction') }}
      </BaseButton>
    </div>
  </div>
</template>
