<script setup lang="ts">
import { ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useNumberFormat } from '~/composables/use_number_format'
import { useRowDeleteConfirmation } from '~/composables/use_row_delete_confirmation'
import { useT } from '~/composables/use_t'
import type { PurchaseOrderRow, PurchaseOrderStatus } from '#shared/types/inventory'

/** Bons de commande (#892), ouverts d'abord. Chaque geste dépend du statut. */
defineProps<{
  orders: PurchaseOrderRow[]
  canManage: boolean
  canDelete: boolean
}>()

const emit = defineEmits<{ edit: [order: PurchaseOrderRow] }>()

const { t } = useT()
const { formatDate } = useDateFormat()
const { formatCurrency, formatNumber } = useNumberFormat()

const STATUS_VARIANT: Record<PurchaseOrderStatus, 'neutral' | 'info' | 'success' | 'empty'> = {
  draft: 'neutral',
  sent: 'info',
  received: 'success',
  cancelled: 'empty',
}

const receiving = ref<PurchaseOrderRow | null>(null)
const deletion = useRowDeleteConfirmation<PurchaseOrderRow>({
  url: (order) => `/inventory/orders/${order.id}`,
  visit: { preserveScroll: true },
})

function post(order: PurchaseOrderRow, action: 'send' | 'receive' | 'cancel') {
  router.post(`/inventory/orders/${order.id}/${action}`, {}, { preserveScroll: true })
}

function confirmReceive() {
  if (receiving.value) post(receiving.value, 'receive')
  receiving.value = null
}

function isOpen(order: PurchaseOrderRow) {
  return order.status === 'draft' || order.status === 'sent'
}
</script>

<template>
  <p v-if="orders.length === 0" class="py-10 text-center text-sm text-fg-muted">
    {{ t('inventory.orders.empty') }}
  </p>
  <ul v-else class="space-y-3">
    <li
      v-for="order in orders"
      :key="order.id"
      class="rounded-lg border border-border bg-surface-elevated p-4"
      :data-testid="`purchase-order-${order.id}`"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <p class="font-semibold text-fg">
              {{ t('inventory.orders.number', { number: String(order.number) }) }}
            </p>
            <BaseBadge :variant="STATUS_VARIANT[order.status]">
              {{ t(`inventory.orders.status.${order.status}`) }}
            </BaseBadge>
          </div>
          <p class="text-sm text-fg-muted">
            {{ order.supplierName }}
            · {{ order.boatName ?? t('inventory.orders.form.workshop') }}
            <template v-if="order.orderedOn">
              · {{ t('inventory.orders.orderedOn', { date: formatDate(order.orderedOn) }) }}
            </template>
            <template v-if="order.receivedAt">
              · {{ t('inventory.orders.receivedOn', { date: formatDate(order.receivedAt) }) }}
            </template>
          </p>
          <p class="mt-1 text-xs text-fg-subtle">
            {{
              order.lines
                .map((line) => `${formatNumber(line.quantity)} × ${line.itemName}`)
                .join(' · ')
            }}
          </p>
        </div>
        <p class="shrink-0 font-semibold text-fg">{{ formatCurrency(order.total) }}</p>
      </div>

      <div v-if="canManage || canDelete" class="mt-3 flex flex-wrap gap-1">
        <template v-if="canManage && order.status === 'draft'">
          <BaseButton size="sm" variant="ghost" @click="emit('edit', order)">
            {{ t('inventory.list.edit') }}
          </BaseButton>
          <BaseButton size="sm" variant="secondary" @click="post(order, 'send')">
            {{ t('inventory.orders.actions.send') }}
          </BaseButton>
        </template>
        <template v-if="canManage && isOpen(order)">
          <BaseButton
            size="sm"
            :data-testid="`purchase-order-receive-${order.id}`"
            @click="receiving = order"
          >
            {{ t('inventory.orders.actions.receive') }}
          </BaseButton>
          <BaseButton size="sm" variant="ghost" @click="post(order, 'cancel')">
            {{ t('inventory.orders.actions.cancel') }}
          </BaseButton>
        </template>
        <BaseButton
          v-if="canDelete && (order.status === 'draft' || order.status === 'cancelled')"
          size="sm"
          variant="ghost"
          @click="deletion.ask(order)"
        >
          <span class="text-danger">{{ t('inventory.orders.actions.delete') }}</span>
        </BaseButton>
      </div>
    </li>
  </ul>

  <BaseConfirmModal
    :open="receiving !== null"
    :title="t('inventory.orders.receiveConfirm.title')"
    :message="
      receiving?.boatName
        ? t('inventory.orders.receiveConfirm.messageBoat', { boat: receiving.boatName })
        : t('inventory.orders.receiveConfirm.message')
    "
    :confirm-label="t('inventory.orders.actions.receive')"
    :cancel-label="t('common.cancel')"
    @update:open="!$event && (receiving = null)"
    @confirm="confirmReceive"
  />
  <BaseConfirmModal
    :open="deletion.isOpen.value"
    :title="t('inventory.orders.deleteConfirm.title')"
    :message="t('inventory.orders.deleteConfirm.message')"
    :confirm-label="t('inventory.orders.actions.delete')"
    :cancel-label="t('common.cancel')"
    @update:open="deletion.release()"
    @confirm="deletion.confirm()"
  />
</template>
