<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useT } from '~/composables/use_t'
import { boatStatusVariant } from '~/utils/status_variants'
import type { BoatStatus } from '#shared/types/boat_status'

/** Statut de disponibilité d'un bateau (#870) — liste, cartes et fiche. */
defineProps<{ status: BoatStatus }>()

const { t } = useT()
</script>

<template>
  <BaseBadge :variant="boatStatusVariant(status)" data-testid="boat-status-badge">
    {{ t(`boats.availability.status.${status}`) }}
  </BaseBadge>
</template>
