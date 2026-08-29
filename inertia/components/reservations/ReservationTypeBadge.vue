<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useT } from '~/composables/use_t'
import type { ReservationType } from '~/types/reservation'

defineProps<{
  type: ReservationType | null
}>()

const { t } = useT()

const variantMap: Record<ReservationType, 'info' | 'success' | 'warning' | 'neutral' | 'empty'> = {
  bareboat: 'info',
  skippered: 'success',
  day_charter: 'warning',
  cabin: 'neutral',
  other: 'empty',
}
</script>

<template>
  <!-- Les réservations antérieures à #585 n'ont pas de type : pas de badge
       plutôt qu'un « Autre » trompeur. -->
  <BaseBadge v-if="type" :variant="variantMap[type]">
    {{ t(`reservations.types.${type}`) }}
  </BaseBadge>
  <span v-else class="text-fg-subtle">—</span>
</template>
