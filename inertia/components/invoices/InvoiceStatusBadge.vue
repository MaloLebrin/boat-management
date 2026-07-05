<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useT } from '~/composables/use_t'
import type { InvoiceStatus } from '../../../shared/types/invoice'

defineProps<{
  status: InvoiceStatus
}>()

const { t } = useT()

const variantMap: Record<InvoiceStatus, 'success' | 'neutral' | 'danger' | 'warning' | 'info'> = {
  draft: 'neutral',
  sent: 'info',
  paid: 'success',
  overdue: 'warning',
  cancelled: 'danger',
}
</script>

<template>
  <BaseBadge :variant="variantMap[status]">
    {{ t(`invoices.status.${status}`) }}
  </BaseBadge>
</template>
