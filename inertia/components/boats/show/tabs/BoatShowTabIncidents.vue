<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { onMounted, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BoatIncidentModal from '~/components/boats/incidents/BoatIncidentModal.vue'
import IncidentTargetBadge from '~/components/boats/incidents/IncidentTargetBadge.vue'
import { useT } from '~/composables/use_t'
import { useDateFormat } from '~/composables/use_date_format'
import type {
  BoatCreateIntent,
  BoatIncidentRow,
  BoatShowDetail,
  IncidentStatus,
} from '~/types/boat_show'
import { confirmDelete } from '~/utils/native_dialog'

const props = withDefaults(
  defineProps<{
    boat: BoatShowDetail
    incidents: BoatIncidentRow[]
    /** `incidents.create` — bouton « Déclarer » et intention d'ouverture (#816). */
    canCreate: boolean
    /** `incidents.edit` — bouton « Modifier » de chaque carte (#816). */
    canEdit: boolean
    /** `incidents.delete` — réservé aux admins. */
    canDelete: boolean
    createIntent?: BoatCreateIntent
  }>(),
  { createIntent: null }
)

const emit = defineEmits<{ createIntentConsumed: [] }>()

const { t } = useT()
const { formatDate } = useDateFormat()

const isModalOpen = ref(false)
const editingIncident = ref<BoatIncidentRow | null>(null)

// L'onglet est monté après la demande d'ouverture (prop différée) : on consomme
// l'intention au montage, et si elle change alors que l'onglet est affiché (#365).
function consumeCreateIntent() {
  if (props.createIntent !== 'incident') return
  if (props.canCreate) openCreate()
  emit('createIntentConsumed')
}

onMounted(consumeCreateIntent)
watch(() => props.createIntent, consumeCreateIntent)

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

function openCreate() {
  editingIncident.value = null
  isModalOpen.value = true
}

function openEdit(incident: BoatIncidentRow) {
  editingIncident.value = incident
  isModalOpen.value = true
}

function deleteIncident(incidentId: number) {
  confirmDelete(
    t('incidents.form.confirmDelete'),
    `/boats/${props.boat.id}/incidents/${incidentId}`,
    { preserveScroll: true }
  )
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-fg-muted">
        {{ t('incidents.count', { count: String(incidents.length) }) }}
      </p>
      <BaseButton v-if="canCreate" variant="primary" size="sm" type="button" @click="openCreate">
        {{ t('incidents.addIncident') }}
      </BaseButton>
    </div>

    <!-- Create / Edit modal — `boat` est structurellement une TaskEquipmentSource -->
    <BoatIncidentModal
      v-if="canCreate || canEdit"
      v-model:open="isModalOpen"
      :boat-id="boat.id"
      :equipment="boat"
      :editing-incident="editingIncident"
    />

    <!-- Incidents list -->
    <div v-if="incidents.length > 0" class="space-y-3">
      <div
        v-for="incident in incidents"
        :key="incident.id"
        :class="[
          'rounded-lg border p-4',
          incident.status === 'open'
            ? 'border-coral-200 bg-coral-50'
            : incident.status === 'in_progress'
              ? 'border-amber-200 bg-amber-50'
              : 'border-border bg-surface-elevated',
        ]"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <!-- Type + status badge + target -->
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <Link
                :href="`/boats/${boat.id}/incidents/${incident.id}`"
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
              <IncidentTargetBadge
                v-if="incident.target"
                :target="incident.target"
                :boat-id="boat.id"
              />
              <span v-if="incident.insuranceClaimed" class="text-xs text-fg-muted">
                {{ t('incidents.insuranceDeclared') }}
                <span v-if="incident.insuranceClaimRef">#{{ incident.insuranceClaimRef }}</span>
              </span>
              <span v-if="incident.photosCount > 0" class="text-xs text-fg-muted">
                · {{ t('incidents.photosCount', { count: String(incident.photosCount) }) }}
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
          <div v-if="canEdit || canDelete" class="flex items-center gap-2 shrink-0">
            <BaseButton
              v-if="canEdit"
              type="button"
              variant="ghost"
              size="sm"
              @click="openEdit(incident)"
            >
              {{ t('incidents.form.edit') }}
            </BaseButton>
            <BaseButton
              v-if="canDelete"
              type="button"
              variant="ghost"
              size="sm"
              @click="deleteIncident(incident.id)"
            >
              {{ t('incidents.form.delete') }}
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="rounded-lg border border-dashed border-border bg-surface-muted/30 p-8 text-center"
    >
      <p class="text-fg-muted">{{ t('incidents.empty') }}</p>
      <BaseButton
        v-if="canCreate"
        variant="secondary"
        size="sm"
        type="button"
        class="mt-4"
        @click="openCreate"
      >
        {{ t('incidents.addIncident') }}
      </BaseButton>
    </div>
  </div>
</template>
