<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useT } from '~/composables/use_t'
import type { ClientStatus } from '../../../shared/types/client'

defineProps<{
  status: ClientStatus
}>()

const { t } = useT()

const variantMap: Record<ClientStatus, 'success' | 'neutral' | 'danger'> = {
  active: 'success',
  inactive: 'neutral',
  blacklisted: 'danger',
}
</script>

<template>
  <BaseBadge :variant="variantMap[status]">
    {{ t(`clients.status.${status}`) }}
  </BaseBadge>
</template>
