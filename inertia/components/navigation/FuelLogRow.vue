<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type { FleetFuelLogRow } from '../../../shared/types/navigation'

const { t } = useT()
const { formatDate } = useDateFormat()
const { formatNumber, formatCurrency } = useNumberFormat()

defineProps<{ row: FleetFuelLogRow }>()
</script>

<template>
  <tr class="hover:bg-surface-muted transition-colors">
    <td class="px-4 py-3 text-sm">
      <Link
        :href="`/boats/${row.boatId}/navigation`"
        class="font-medium text-brand hover:underline"
      >
        {{ row.boatName }}
      </Link>
    </td>
    <td class="px-4 py-3 text-sm text-fg-muted">{{ formatDate(row.fueledAt) }}</td>
    <td class="px-4 py-3 text-sm text-fg">
      {{ t('navigation.fuel.liters', { count: formatNumber(row.quantityLiters) }) }}
    </td>
    <td class="px-4 py-3 text-sm text-fg-muted">
      {{ row.totalCost ? formatCurrency(row.totalCost) : '—' }}
    </td>
    <td class="px-4 py-3 text-sm text-fg-muted">{{ row.supplier ?? '—' }}</td>
  </tr>
</template>
