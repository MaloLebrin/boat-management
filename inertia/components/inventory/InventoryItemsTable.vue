<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type { InventoryItemRow } from '#shared/types/inventory'

/** Liste des articles du stock central (#892) — stock bas signalé en rouge. */
defineProps<{
  items: InventoryItemRow[]
  canManage: boolean
}>()

const emit = defineEmits<{
  adjust: [item: InventoryItemRow]
  edit: [item: InventoryItemRow]
}>()

const { t } = useT()
const { formatNumber, formatCurrency } = useNumberFormat()

function quantityLabel(item: InventoryItemRow): string {
  return `${formatNumber(item.quantity)} ${t(`inventory.units.${item.unit}`)}`
}
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-border">
    <table class="w-full text-left text-sm">
      <thead class="bg-surface-muted/50 text-fg-muted">
        <tr>
          <th class="px-4 py-3 font-medium">{{ t('inventory.fields.name') }}</th>
          <th class="px-4 py-3 font-medium">{{ t('inventory.fields.quantity') }}</th>
          <th class="hidden px-4 py-3 font-medium sm:table-cell">
            {{ t('inventory.fields.minQuantity') }}
          </th>
          <th class="hidden px-4 py-3 font-medium md:table-cell">
            {{ t('inventory.fields.location') }}
          </th>
          <th class="hidden px-4 py-3 font-medium md:table-cell">
            {{ t('inventory.fields.averageCost') }}
          </th>
          <th class="hidden px-4 py-3 font-medium lg:table-cell">
            {{ t('inventory.fields.supplier') }}
          </th>
          <th class="px-4 py-3 text-right font-medium">{{ t('inventory.list.actions') }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        <tr
          v-for="item in items"
          :key="item.id"
          class="hover:bg-surface-muted/30"
          :data-testid="`inventory-row-${item.id}`"
          :data-low="item.isLow"
        >
          <td class="px-4 py-3">
            <Link :href="`/inventory/${item.id}`" class="font-medium text-fg hover:underline">
              {{ item.name }}
            </Link>
            <p class="text-xs text-fg-muted">
              <template v-if="item.reference">{{ item.reference }}</template>
              <template v-if="item.linkedPartsCount > 0">
                <template v-if="item.reference"> · </template>
                {{ t('inventory.list.linkedParts', { count: String(item.linkedPartsCount) }) }}
              </template>
            </p>
          </td>
          <td class="px-4 py-3">
            <BaseBadge v-if="item.isLow" variant="danger">{{ quantityLabel(item) }}</BaseBadge>
            <span v-else class="text-fg">{{ quantityLabel(item) }}</span>
          </td>
          <td class="hidden px-4 py-3 text-fg-muted sm:table-cell">
            {{ item.minQuantity === null ? '—' : formatNumber(item.minQuantity) }}
          </td>
          <td class="hidden px-4 py-3 text-fg-muted md:table-cell">{{ item.location ?? '—' }}</td>
          <td class="hidden px-4 py-3 text-fg-muted md:table-cell">
            {{ item.averageCost === null ? '—' : formatCurrency(item.averageCost) }}
          </td>
          <td class="hidden px-4 py-3 text-fg-muted lg:table-cell">
            {{ item.supplierName ?? '—' }}
          </td>
          <td class="px-4 py-3 text-right">
            <div v-if="canManage" class="flex items-center justify-end gap-1">
              <BaseButton variant="secondary" size="sm" @click="emit('adjust', item)">
                {{ t('inventory.list.count') }}
              </BaseButton>
              <BaseButton variant="ghost" size="sm" @click="emit('edit', item)">
                {{ t('inventory.list.edit') }}
              </BaseButton>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
