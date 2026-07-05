<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/use_t'
import type { InvoiceDetail } from '../../../shared/types/invoice'

const props = defineProps<{
  invoice: InvoiceDetail
}>()

const { t } = useT()

function formatAmount(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: props.invoice.currency,
  }).format(amount)
}
</script>

<template>
  <BaseCard>
    <p class="mb-4 text-sm font-semibold text-fg">{{ t('invoices.lines.title') }}</p>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border text-left text-fg-muted">
            <th class="pb-2 pr-4 font-medium">{{ t('invoices.lines.label') }}</th>
            <th class="pb-2 pr-4 text-right font-medium">{{ t('invoices.lines.quantity') }}</th>
            <th class="pb-2 pr-4 text-right font-medium">{{ t('invoices.lines.unitPrice') }}</th>
            <th class="pb-2 text-right font-medium">{{ t('invoices.lines.amount') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in invoice.lines" :key="line.id" class="border-b border-border">
            <td class="py-2 pr-4 text-fg">{{ line.label }}</td>
            <td class="py-2 pr-4 text-right text-fg-muted">{{ line.quantity }}</td>
            <td class="py-2 pr-4 text-right text-fg-muted">{{ formatAmount(line.unitPrice) }}</td>
            <td class="py-2 text-right font-medium text-fg">{{ formatAmount(line.amount) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div class="mt-4 flex flex-col items-end border-t border-border pt-4">
      <div class="flex w-48 justify-between text-sm">
        <span class="text-fg-muted">{{ t('invoices.totals.subtotal') }}</span>
        <span class="font-medium text-fg">{{ formatAmount(invoice.subtotal) }}</span>
      </div>
      <div class="mt-1 flex w-48 justify-between text-sm">
        <span class="text-fg-muted">
          {{ t('invoices.totals.tax', { rate: String(invoice.taxRate) }) }}
        </span>
        <span class="font-medium text-fg">{{ formatAmount(invoice.taxAmount) }}</span>
      </div>
      <div class="mt-2 flex w-48 justify-between border-t border-border pt-2 text-base">
        <span class="font-semibold text-fg">{{ t('invoices.totals.total') }}</span>
        <span class="font-bold text-fg">{{ formatAmount(invoice.total) }}</span>
      </div>
    </div>
  </BaseCard>
</template>
