<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type {
  InventoryMovementReason,
  InventoryMovementRow,
  InventoryUnit,
} from '#shared/types/inventory'

/** Journal des entrées et sorties d'un article (#892), le plus récent d'abord. */
defineProps<{
  movements: InventoryMovementRow[]
  unit: InventoryUnit
}>()

const { t } = useT()
const { formatDateTime } = useDateFormat()
const { formatNumber, formatCurrency } = useNumberFormat()

const REASON_VARIANT: Record<InventoryMovementReason, 'success' | 'info' | 'warning' | 'neutral'> =
  {
    purchase: 'success',
    consumption: 'warning',
    adjustment: 'neutral',
    return: 'info',
  }

function signed(quantity: number): string {
  return `${quantity > 0 ? '+' : ''}${formatNumber(quantity)}`
}
</script>

<template>
  <p v-if="movements.length === 0" class="py-6 text-center text-sm text-fg-muted">
    {{ t('inventory.movements.empty') }}
  </p>
  <ul v-else class="divide-y divide-border">
    <li
      v-for="movement in movements"
      :key="movement.id"
      class="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
      :data-testid="`inventory-movement-${movement.id}`"
    >
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <BaseBadge :variant="REASON_VARIANT[movement.reason]">
            {{ t(`inventory.movements.reasons.${movement.reason}`) }}
          </BaseBadge>
          <span class="text-xs text-fg-muted">{{ formatDateTime(movement.occurredAt) }}</span>
          <span v-if="movement.userName" class="text-xs text-fg-subtle">
            · {{ movement.userName }}
          </span>
        </div>
        <p v-if="movement.note" class="mt-1 text-sm text-fg-muted">{{ movement.note }}</p>
        <Link
          v-if="movement.purchaseOrderNumber !== null"
          href="/inventory/orders"
          class="mt-1 inline-block text-xs text-brand hover:underline"
        >
          {{ t('inventory.movements.order', { number: String(movement.purchaseOrderNumber) }) }}
        </Link>
      </div>
      <div class="shrink-0 text-right">
        <p class="font-semibold" :class="movement.quantity > 0 ? 'text-success' : 'text-danger'">
          {{ signed(movement.quantity) }} {{ t(`inventory.units.${unit}`) }}
        </p>
        <p v-if="movement.unitCost !== null" class="text-xs text-fg-subtle">
          {{ t('inventory.movements.unitCost', { cost: formatCurrency(movement.unitCost) }) }}
        </p>
      </div>
    </li>
  </ul>
</template>
