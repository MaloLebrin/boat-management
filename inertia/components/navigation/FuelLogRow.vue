<script setup lang="ts">
import { useT } from '~/composables/use_t'
import type { FleetFuelLogRow } from '../../../shared/types/navigation'

const { t, locale } = useT()

defineProps<{ row: FleetFuelLogRow }>()

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(locale.value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCost(cost: number): string {
  return new Intl.NumberFormat(locale.value, { style: 'currency', currency: 'EUR' }).format(cost)
}
</script>

<template>
  <tr class="hover:bg-surface-muted transition-colors">
    <td class="px-4 py-3 text-sm">
      <a :href="`/boats/${row.boatId}/navigation`" class="font-medium text-brand hover:underline">
        {{ row.boatName }}
      </a>
    </td>
    <td class="px-4 py-3 text-sm text-fg-muted">{{ formatDate(row.fueledAt) }}</td>
    <td class="px-4 py-3 text-sm text-fg">
      {{ t('navigation.fuel.liters', { count: String(row.quantityLiters) }) }}
    </td>
    <td class="px-4 py-3 text-sm text-fg-muted">
      {{ row.totalCost ? formatCost(row.totalCost) : '—' }}
    </td>
    <td class="px-4 py-3 text-sm text-fg-muted">{{ row.supplier ?? '—' }}</td>
  </tr>
</template>
