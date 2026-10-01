<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useT } from '~/composables/use_t'
import type { CrewCertificationStatus } from '#shared/types/crew'

/** État le plus grave des certifications d'un équipier (#882), rien s'il est en règle. */
defineProps<{
  status: CrewCertificationStatus | null
}>()

const { t } = useT()
</script>

<template>
  <BaseBadge
    v-if="status === 'expired' || status === 'expiring_soon'"
    :variant="status === 'expired' ? 'danger' : 'warning'"
    data-testid="crew-member-status"
  >
    {{ t(`crew.memberStatus.${status}`) }}
  </BaseBadge>
</template>
