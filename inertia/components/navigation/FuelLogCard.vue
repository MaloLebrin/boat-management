<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import { engineFuelLabel } from '~/utils/boat_enum_labels'
import type { FleetFuelLogRow } from '../../../shared/types/navigation'

const { t } = useT()
const { formatDate } = useDateFormat()
const { formatNumber, formatCurrency } = useNumberFormat()

defineProps<{ row: FleetFuelLogRow }>()
</script>

<template>
  <!-- Repli carte mobile de FuelLogRow (#493) — quantité et coût priment,
       le fournisseur est secondaire -->
  <div class="rounded-lg border border-border bg-surface-elevated p-4 space-y-2">
    <div class="flex items-center justify-between gap-3">
      <Link
        :href="`/boats/${row.boatId}/navigation`"
        class="font-medium text-brand hover:underline truncate"
      >
        {{ row.boatName }}
      </Link>
      <span class="text-sm text-fg-muted shrink-0">{{ formatDate(row.fueledAt) }}</span>
    </div>

    <p class="text-sm font-medium text-fg">
      {{ t('navigation.fuel.liters', { count: formatNumber(row.quantityLiters) }) }}
      <template v-if="row.totalCost"> · {{ formatCurrency(row.totalCost) }}</template>
      <template v-if="row.fuelType"> · {{ engineFuelLabel(t, row.fuelType) }}</template>
    </p>

    <p v-if="row.supplier" class="text-sm text-fg-muted">{{ row.supplier }}</p>
  </div>
</template>
