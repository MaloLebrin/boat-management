<script setup lang="ts">
import { computed } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useT } from '~/composables/use_t'
import type { InvoiceKind, InvoiceStatus } from '../../../shared/types/invoice'

const props = defineProps<{
  status: InvoiceStatus
  /** Sur un avoir (#877), `sent` se lit « émis » et `paid` « remboursé ». */
  kind?: InvoiceKind
}>()

const { t } = useT()

const variantMap: Record<InvoiceStatus, 'success' | 'neutral' | 'danger' | 'warning' | 'info'> = {
  draft: 'neutral',
  sent: 'info',
  paid: 'success',
  overdue: 'warning',
  cancelled: 'danger',
  credited: 'neutral',
}

const label = computed(() =>
  props.kind === 'credit_note' && (props.status === 'sent' || props.status === 'paid')
    ? t(`invoices.creditNote.status.${props.status}`)
    : t(`invoices.status.${props.status}`)
)
</script>

<template>
  <BaseBadge :variant="variantMap[status]">
    {{ label }}
  </BaseBadge>
</template>
