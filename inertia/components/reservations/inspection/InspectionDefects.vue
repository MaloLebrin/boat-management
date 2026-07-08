<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { ref } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import InspectionDefectModal from '~/components/reservations/inspection/InspectionDefectModal.vue'
import { useCurrencyFormat } from '~/composables/use_currency_format'
import { useT } from '~/composables/use_t'
import type { BoatEquipmentActionRow } from '~/types/boat_show'

const props = defineProps<{
  boatId: number
  reservationId: number
  inspectionId: number
  actions: BoatEquipmentActionRow[]
  canManage: boolean
  canDelete: boolean
}>()

const { t } = useT()
const { formatCurrency } = useCurrencyFormat()

const isModalOpen = ref(false)
const toDelete = ref<BoatEquipmentActionRow | null>(null)

function confirmDelete() {
  if (!toDelete.value) return
  router.delete(
    `/boats/${props.boatId}/reservations/${props.reservationId}/inspections/${props.inspectionId}/equipment-actions/${toDelete.value.id}`,
    { preserveScroll: true }
  )
  toDelete.value = null
}
</script>

<template>
  <div class="border-t border-border pt-4">
    <InspectionDefectModal
      v-model:open="isModalOpen"
      :boat-id="boatId"
      :reservation-id="reservationId"
      :inspection-id="inspectionId"
    />
    <BaseConfirmModal
      :open="toDelete !== null"
      :title="t('equipmentActions.defects.deleteTitle')"
      :message="t('equipmentActions.form.confirmDelete')"
      :confirm-label="t('equipmentActions.form.delete')"
      @update:open="toDelete = null"
      @confirm="confirmDelete"
    />

    <div class="mb-3 flex items-center justify-between">
      <p class="text-sm font-semibold text-fg">{{ t('equipmentActions.defects.title') }}</p>
      <BaseButton v-if="canManage" variant="secondary" size="sm" @click="isModalOpen = true">
        {{ t('equipmentActions.defects.add') }}
      </BaseButton>
    </div>

    <p v-if="actions.length === 0" class="text-sm text-fg-muted">
      {{ t('equipmentActions.defects.empty') }}
    </p>

    <ul v-else class="space-y-2">
      <li
        v-for="action in actions"
        :key="action.id"
        class="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-elevated px-3 py-2"
      >
        <div class="min-w-0 flex-1">
          <div class="mb-1 flex flex-wrap items-center gap-2">
            <BaseBadge variant="neutral">
              {{ t(`equipmentActions.actionType.${action.actionType}`) }}
            </BaseBadge>
            <span class="text-xs text-fg-muted">
              {{ t(`equipmentActions.status.${action.status}`) }}
            </span>
          </div>
          <p class="truncate text-sm font-medium text-fg">{{ action.label }}</p>
          <p v-if="action.estimatedCost !== null" class="text-xs text-fg-muted">
            {{ t('equipmentActions.fields.estimatedCost') }}:
            {{ formatCurrency(action.estimatedCost) }}
          </p>
        </div>
        <button
          v-if="canDelete"
          type="button"
          class="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-fg-subtle transition-colors hover:bg-danger/10 hover:text-danger"
          @click="toDelete = action"
        >
          {{ t('equipmentActions.form.delete') }}
        </button>
      </li>
    </ul>
  </div>
</template>
