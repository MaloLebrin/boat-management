<script setup lang="ts">
import { ref } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import InspectionDefectModal from '~/components/reservations/inspection/InspectionDefectModal.vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type { BoatEquipmentActionRow } from '~/types/boat_show'
import { useRowDeleteConfirmation } from '~/composables/use_row_delete_confirmation'

const props = defineProps<{
  boatId: number
  reservationId: number
  /**
   * ID réel, ou jeton temporaire d'un état des lieux encore en file (#622) —
   * la suppression est alors désactivée par l'appelant (rien à supprimer côté
   * serveur).
   */
  inspectionId: number | string
  actions: BoatEquipmentActionRow[]
  canManage: boolean
  canDelete: boolean
}>()

const { t } = useT()
const { formatCurrency } = useNumberFormat()

const isModalOpen = ref(false)
const defectDeletion = useRowDeleteConfirmation<BoatEquipmentActionRow>({
  url: (action) =>
    `/boats/${props.boatId}/reservations/${props.reservationId}/inspections/${props.inspectionId}/equipment-actions/${action.id}`,
  visit: { preserveScroll: true },
})
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
      :open="defectDeletion.isOpen.value"
      :title="t('equipmentActions.defects.deleteTitle')"
      :message="t('equipmentActions.form.confirmDelete')"
      :confirm-label="t('equipmentActions.form.delete')"
      @update:open="defectDeletion.release()"
      @confirm="defectDeletion.confirm()"
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
          @click="defectDeletion.ask(action)"
        >
          {{ t('equipmentActions.form.delete') }}
        </button>
      </li>
    </ul>
  </div>
</template>
