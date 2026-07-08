<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useCurrencyFormat } from '~/composables/use_currency_format'
import { useT } from '~/composables/use_t'
import type { BoatEquipmentActionRow, EquipmentActionStatus } from '~/types/boat_show'

defineProps<{
  action: BoatEquipmentActionRow
  canManage: boolean
  canDelete: boolean
}>()

const emit = defineEmits<{
  edit: [action: BoatEquipmentActionRow]
  delete: [id: number]
}>()

const { t } = useT()
const { formatCurrency } = useCurrencyFormat()

const STATUS_COLORS: Record<EquipmentActionStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  ordered: 'bg-blue-50 text-blue-700 border-blue-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-surface-muted text-fg-muted border-border',
}

const STATUS_DOT: Record<EquipmentActionStatus, string> = {
  pending: 'bg-amber-500',
  ordered: 'bg-blue-500',
  done: 'bg-emerald-500',
  cancelled: 'bg-fg-subtle',
}
</script>

<template>
  <div
    :class="[
      'rounded-lg border p-4',
      action.status === 'pending'
        ? 'border-amber-200 bg-amber-50'
        : action.status === 'ordered'
          ? 'border-blue-200 bg-blue-50'
          : action.status === 'done'
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-border bg-surface-elevated',
    ]"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <!-- Type + status badge -->
        <div class="flex flex-wrap items-center gap-2 mb-1">
          <BaseBadge variant="neutral">
            {{ t(`equipmentActions.actionType.${action.actionType}`) }}
          </BaseBadge>
          <span
            :class="[
              'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
              STATUS_COLORS[action.status],
            ]"
          >
            <span :class="['h-1.5 w-1.5 rounded-full', STATUS_DOT[action.status]]" />
            {{ t(`equipmentActions.status.${action.status}`) }}
          </span>
        </div>

        <!-- Label -->
        <p class="font-semibold text-fg mt-2">{{ action.label }}</p>

        <!-- Notes -->
        <p v-if="action.notes" class="text-sm text-fg-muted mt-1 whitespace-pre-wrap">
          {{ action.notes }}
        </p>

        <!-- Costs -->
        <div class="flex flex-wrap items-center gap-4 mt-2 text-sm">
          <span v-if="action.estimatedCost !== null" class="text-fg-muted">
            {{ t('equipmentActions.fields.estimatedCost') }}:
            <span class="font-medium text-fg">{{ formatCurrency(action.estimatedCost) }}</span>
          </span>
          <span v-if="action.actualCost !== null" class="text-fg-muted">
            {{ t('equipmentActions.fields.actualCost') }}:
            <span class="font-medium text-fg">{{ formatCurrency(action.actualCost) }}</span>
          </span>
        </div>

        <!-- Equipment reference -->
        <p v-if="action.equipmentType" class="text-xs text-fg-muted mt-2">
          {{ t(`equipmentActions.equipmentType.${action.equipmentType}`) }}
        </p>
      </div>

      <!-- Actions -->
      <div v-if="canManage" class="flex items-center gap-2 shrink-0">
        <BaseButton type="button" variant="ghost" size="sm" @click="emit('edit', action)">
          {{ t('equipmentActions.form.edit') }}
        </BaseButton>
        <BaseButton
          v-if="canDelete"
          type="button"
          variant="ghost"
          size="sm"
          @click="emit('delete', action.id)"
        >
          {{ t('equipmentActions.form.delete') }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>
