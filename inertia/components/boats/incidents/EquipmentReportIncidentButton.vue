<script setup lang="ts">
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import type { IncidentTargetRef } from '#shared/types/incident'

/** Raccourci « Incident » posé sur une carte d'équipement de l'onglet Équipements (#813). */
const props = defineProps<{ target: IncidentTargetRef }>()

const emit = defineEmits<{ (e: 'reportIncident', target: IncidentTargetRef): void }>()

const { t } = useT()
</script>

<template>
  <BaseButton
    variant="ghost"
    size="sm"
    type="button"
    data-testid="equipment-report-incident"
    :aria-label="t('incidents.reportForEquipment')"
    @click="emit('reportIncident', props.target)"
  >
    <ExclamationTriangleIcon class="h-4 w-4" aria-hidden="true" />
    {{ t('incidents.reportShort') }}
  </BaseButton>
</template>
