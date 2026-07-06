<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useT } from '~/composables/use_t'
import type { RentalContractStatus } from '~/types/rental_contract'

defineProps<{
  status: RentalContractStatus
}>()

const { t } = useT()

const variantMap: Record<RentalContractStatus, 'neutral' | 'warning' | 'success'> = {
  draft: 'neutral',
  sent: 'warning',
  signed: 'success',
}
</script>

<template>
  <BaseBadge :variant="variantMap[status]">
    {{ t(`rentalContracts.statuses.${status}`) }}
  </BaseBadge>
</template>
