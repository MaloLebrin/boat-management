<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseButton from '~/components/base/BaseButton.vue'
import IncidentFollowUpButtons from '~/components/boats/incidents/IncidentFollowUpButtons.vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import IncidentTargetBadge from '~/components/boats/incidents/IncidentTargetBadge.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { BoatIncidentRow, EquipmentActionPrefill, IncidentStatus } from '~/types/boat_show'
import type { IncidentTaskPrefill } from '~/utils/incident_follow_ups'

/**
 * Carte d'un incident sur l'onglet Incidents de la fiche bateau : type (lien
 * vers la page de détail), statut, cible, assurance, photos, suites (#815),
 * puis les actions — modifier, supprimer, créer une tâche ou une action.
 */
withDefaults(
  defineProps<{
    boatId: number
    incident: BoatIncidentRow
    canEdit: boolean
    canDelete: boolean
    canCreateTask?: boolean
    canCreateAction?: boolean
    /** Tâches + actions tracées par l'incident ; `null` tant que les listes ne sont pas chargées. */
    followUpCount?: number | null
  }>(),
  { canCreateTask: false, canCreateAction: false, followUpCount: null }
)

defineEmits<{
  edit: [incident: BoatIncidentRow]
  delete: [incidentId: number]
  createTask: [payload: IncidentTaskPrefill]
  createAction: [payload: EquipmentActionPrefill]
}>()

const { t } = useT()
const { formatDate } = useDateFormat()

const STATUS_COLORS: Record<IncidentStatus, string> = {
  open: 'bg-coral-50 text-coral-700 border-coral-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  closed: 'bg-surface-muted text-fg-muted border-border',
}

const STATUS_DOT: Record<IncidentStatus, string> = {
  open: 'bg-coral-500',
  in_progress: 'bg-amber-600',
  closed: 'bg-fg-subtle',
}

const CARD_COLORS: Record<IncidentStatus, string> = {
  open: 'border-coral-200 bg-coral-50',
  in_progress: 'border-amber-200 bg-amber-50',
  closed: 'border-border bg-surface-elevated',
}
</script>

<template>
  <div :class="['rounded-lg border p-4', CARD_COLORS[incident.status]]">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <!-- Type + status badge + target -->
        <div class="flex flex-wrap items-center gap-2 mb-1">
          <Link
            :href="`/boats/${boatId}/incidents/${incident.id}`"
            class="font-semibold text-fg hover:underline"
            data-testid="incident-detail-link"
          >
            {{ t(`incidents.type.${incident.type}`) }}
          </Link>
          <span
            :class="[
              'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
              STATUS_COLORS[incident.status],
            ]"
          >
            <span :class="['h-1.5 w-1.5 rounded-full', STATUS_DOT[incident.status]]" />
            {{ t(`incidents.status.${incident.status}`) }}
          </span>
          <IncidentTargetBadge v-if="incident.target" :target="incident.target" :boat-id="boatId" />
          <span v-if="incident.insuranceClaimed" class="text-xs text-fg-muted">
            {{ t('incidents.insuranceDeclared') }}
            <span v-if="incident.insuranceClaimRef">#{{ incident.insuranceClaimRef }}</span>
          </span>
          <span v-if="incident.photosCount > 0" class="text-xs text-fg-muted">
            · {{ t('incidents.photosCount', { count: String(incident.photosCount) }) }}
          </span>
          <BaseBadge v-else variant="warning">{{ t('incidents.missingPhoto') }}</BaseBadge>
          <span
            v-if="followUpCount !== null && followUpCount > 0"
            class="text-xs text-fg-muted"
            data-testid="incident-follow-ups-count"
          >
            · {{ t('incidents.followUps.count', { count: String(followUpCount) }) }}
          </span>
        </div>

        <!-- Date + location -->
        <p class="text-xs text-fg-muted mb-2">
          {{ formatDate(incident.occurredAt) }}
          <span v-if="incident.location"> · {{ incident.location }}</span>
        </p>

        <!-- Description -->
        <p class="text-sm text-fg whitespace-pre-wrap">{{ incident.description }}</p>
      </div>

      <!-- Actions -->
      <div
        v-if="canEdit || canDelete || canCreateTask || canCreateAction"
        class="flex flex-wrap items-center gap-2 shrink-0"
      >
        <IncidentFollowUpButtons
          :incident="incident"
          :can-create-task="canCreateTask"
          :can-create-action="canCreateAction"
          @create-task="$emit('createTask', $event)"
          @create-action="$emit('createAction', $event)"
        />
        <BaseButton
          v-if="canEdit"
          type="button"
          variant="ghost"
          size="sm"
          @click="$emit('edit', incident)"
        >
          {{ t('incidents.form.edit') }}
        </BaseButton>
        <BaseButton
          v-if="canDelete"
          type="button"
          variant="ghost"
          size="sm"
          @click="$emit('delete', incident.id)"
        >
          {{ t('incidents.form.delete') }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>
