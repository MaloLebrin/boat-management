<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useT } from '~/composables/use_t'
import type { ReservationStatus } from '~/types/reservation'

defineProps<{
  status: ReservationStatus
}>()

const { t } = useT()

const variantMap: Record<ReservationStatus, 'warning' | 'success' | 'neutral'> = {
  option: 'warning',
  confirmed: 'success',
  cancelled: 'neutral',
}
</script>

<template>
  <BaseBadge :variant="variantMap[status]">
    {{ t(`reservations.status.${status}`) }}
  </BaseBadge>
</template>
