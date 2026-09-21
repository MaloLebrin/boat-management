<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import IncidentTargetBadge from '~/components/boats/incidents/IncidentTargetBadge.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { BoatIncidentRow } from '~/types/boat_show'
import { incidentStatusVariant } from '~/utils/status_variants'

/** En-tête de la page de détail d'un incident (#814) : type, statut, cible, dates, actions. */
defineProps<{
  boatId: number
  incident: BoatIncidentRow
  canManage: boolean
  canDelete: boolean
}>()

const emit = defineEmits<{ edit: []; delete: [] }>()

const { t } = useT()
const { formatDateTime, formatDate } = useDateFormat()
</script>

<template>
  <header class="space-y-6">
    <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-3">
          <BaseHeading level="1">{{ t(`incidents.type.${incident.type}`) }}</BaseHeading>
          <BaseBadge :variant="incidentStatusVariant(incident.status)">
            {{ t(`incidents.status.${incident.status}`) }}
          </BaseBadge>
          <IncidentTargetBadge v-if="incident.target" :target="incident.target" :boat-id="boatId" />
        </div>
        <div class="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-fg-muted">
          <p>{{ formatDateTime(incident.occurredAt) }}</p>
          <p v-if="incident.location">{{ incident.location }}</p>
          <p v-if="incident.closedAt">
            {{ t('incidents.show.closedOn', { date: formatDate(incident.closedAt) }) }}
          </p>
        </div>
        <p v-if="incident.insuranceClaimed" class="mt-2 text-sm text-fg-muted">
          {{ t('incidents.insuranceDeclared') }}
          <span v-if="incident.insuranceClaimRef">#{{ incident.insuranceClaimRef }}</span>
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2 justify-end">
        <BaseButton variant="secondary" size="sm" :href="`/boats/${boatId}?tab=incidents`">
          {{ t('incidents.show.back') }}
        </BaseButton>
        <BaseButton v-if="canManage" size="sm" type="button" @click="emit('edit')">
          {{ t('incidents.show.edit') }}
        </BaseButton>
        <BaseButton
          v-if="canDelete"
          variant="danger"
          size="sm"
          type="button"
          @click="emit('delete')"
        >
          {{ t('incidents.show.delete') }}
        </BaseButton>
      </div>
    </div>
  </header>
</template>
