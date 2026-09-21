<script setup lang="ts">
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BoatIncidentModal from '~/components/boats/incidents/BoatIncidentModal.vue'
import { useT } from '~/composables/use_t'
import type { IncidentTargetRef } from '#shared/types/incident'
import type { TaskEquipmentSource } from '#shared/types/maintenance'

/**
 * Bouton « Signaler un incident » de l'en-tête d'une page équipement ou pièce
 * (#813) : ouvre la modale verrouillée sur cette cible. `targetLabel` porte le
 * nom d'une pièce, que `equipment` (source des libellés) ne connaît pas.
 */
withDefaults(
  defineProps<{
    boatId: number
    target: IncidentTargetRef
    targetLabel?: string | null
    equipment?: TaskEquipmentSource | null
    canReport: boolean
  }>(),
  { targetLabel: null, equipment: null }
)

const { t } = useT()
const isOpen = ref(false)
</script>

<template>
  <template v-if="canReport">
    <BaseButton
      variant="secondary"
      size="sm"
      type="button"
      data-testid="equipment-report-incident"
      @click="isOpen = true"
    >
      <ExclamationTriangleIcon class="h-4 w-4" aria-hidden="true" />
      {{ t('incidents.reportShort') }}
    </BaseButton>

    <BoatIncidentModal
      v-model:open="isOpen"
      :boat-id="boatId"
      :equipment="equipment"
      :prefill="{ target, targetLabel: targetLabel ?? undefined }"
      lock-target
    />
  </template>
</template>
