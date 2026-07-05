<script setup lang="ts">
import { useT } from '~/composables/use_t'

defineProps<{
  subtotal: number
  taxAmount: number
  total: number
  taxRate: string
  currency: string
}>()

const { t } = useT()

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(amount)
}
</script>

<template>
  <div class="flex flex-col items-end border-t border-border pt-4">
    <div class="flex w-48 justify-between text-sm">
      <span class="text-fg-muted">{{ t('invoices.totals.subtotal') }}</span>
      <span class="font-medium text-fg">{{ formatAmount(subtotal, currency) }}</span>
    </div>
    <div class="mt-1 flex w-48 justify-between text-sm">
      <span class="text-fg-muted">{{ t('invoices.totals.tax', { rate: taxRate }) }}</span>
      <span class="font-medium text-fg">{{ formatAmount(taxAmount, currency) }}</span>
    </div>
    <div class="mt-2 flex w-48 justify-between border-t border-border pt-2 text-base">
      <span class="font-semibold text-fg">{{ t('invoices.totals.total') }}</span>
      <span class="font-bold text-fg">{{ formatAmount(total, currency) }}</span>
    </div>
  </div>
</template>
