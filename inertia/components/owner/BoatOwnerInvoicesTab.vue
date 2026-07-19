<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import InvoiceStatusBadge from '~/components/invoices/InvoiceStatusBadge.vue'
import { useT } from '~/composables/use_t'
import type { InvoiceRow } from '../../../shared/types/invoice'

defineProps<{
  invoices: InvoiceRow[]
}>()

const { t } = useT()

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}
</script>

<template>
  <BaseEmptyState v-if="invoices.length === 0" :title="t('owner.boats.show.invoices.emptyTitle')" />

  <div v-else class="flex flex-col gap-3">
    <BaseCard v-for="invoice in invoices" :key="invoice.id">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-fg">{{ invoice.number }}</p>
          <p class="text-xs text-fg-muted">{{ formatDate(invoice.issuedAt) }}</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium text-fg">{{ invoice.total.toFixed(2) }} €</span>
          <InvoiceStatusBadge :status="invoice.status" />
        </div>
      </div>
    </BaseCard>
  </div>
</template>
