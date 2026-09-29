<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useT } from '~/composables/use_t'
import type { ReservationSource } from '#shared/types/reservation'

/**
 * Demande reçue par la page publique de réservation (#881). Une réservation
 * saisie par l'équipe n'affiche rien : c'est le cas courant.
 */
defineProps<{ source: ReservationSource }>()

const { t } = useT()
</script>

<template>
  <BaseBadge v-if="source === 'public'" variant="info" data-testid="reservation-source-public">
    {{ t('reservations.publicBooking.badge') }}
  </BaseBadge>
</template>
