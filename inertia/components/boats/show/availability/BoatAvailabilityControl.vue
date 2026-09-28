<script setup lang="ts">
import { ref } from 'vue'
import BoatStatusBadge from '~/components/boats/BoatStatusBadge.vue'
import BoatStatusModal from '~/components/boats/show/availability/BoatStatusModal.vue'
import { useT } from '~/composables/use_t'
import type { BoatAvailabilitySummary, BoatStatusChangeRow } from '#shared/types/boat_status'

/**
 * Statut de disponibilité dans l'en-tête de la fiche (#870) : le badge, et —
 * avec `boats.edit` — le bouton qui ouvre la modale « Changer le statut ».
 */
defineProps<{
  boatId: number
  availability: BoatAvailabilitySummary
  history: BoatStatusChangeRow[]
  canChange: boolean
}>()

const { t } = useT()
const open = ref(false)
</script>

<template>
  <BoatStatusBadge :status="availability.status" />
  <template v-if="canChange">
    <button
      type="button"
      class="text-xs font-semibold text-brand hover:underline"
      data-testid="boat-status-change"
      @click="open = true"
    >
      {{ t('boats.availability.change') }}
    </button>
    <BoatStatusModal
      v-model:open="open"
      :boat-id="boatId"
      :current-status="availability.status"
      :history="history"
    />
  </template>
</template>
