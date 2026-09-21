<script setup lang="ts">
import { computed, watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import IncidentInsuranceFields from '~/components/boats/incidents/IncidentInsuranceFields.vue'
import IncidentTargetSelect from '~/components/boats/incidents/IncidentTargetSelect.vue'
import { useNetworkStatus } from '~/composables/use_network_status'
import { useOfflineQueue } from '~/composables/use_offline_queue'
import { CREATE_INCIDENT_ACTION, UPDATE_INCIDENT_ACTION } from '#shared/constants/offline_queue'
import { incidentTargetColumns, incidentTargetRefOf } from '#shared/helpers/incident_target'
import { INCIDENT_TYPES } from '#shared/types/incident'
import { useT } from '~/composables/use_t'
import { isoToDatetimeLocalValue, tzOffsetMinutes } from '~/utils/local_datetime'
import type { TaskEquipmentSource } from '#shared/types/maintenance'
import type {
  BoatIncidentRow,
  IncidentFormPrefill,
  IncidentStatus,
  IncidentTargetRef,
  IncidentType,
} from '~/types/boat_show'

/**
 * Formulaire d'incident, réutilisé par tous les points d'entrée. `equipment`
 * alimente le sélecteur de cible ; `prefill` + `lockTarget` la figent (carte ou
 * page équipement/pièce, #813). Les six colonnes de cible voyagent dans le
 * formulaire lui-même : le payload enfilé hors-ligne les porte tel quel.
 */
const props = withDefaults(
  defineProps<{
    boatId: number
    editingIncident: BoatIncidentRow | null
    equipment?: TaskEquipmentSource | null
    prefill?: IncidentFormPrefill | null
    lockTarget?: boolean
  }>(),
  { equipment: null, prefill: null, lockTarget: false }
)

const emit = defineEmits<{
  close: []
}>()

const { t } = useT()
const { isOnline } = useNetworkStatus()
const { enqueue } = useOfflineQueue()

const initialTarget = props.prefill?.target ?? incidentTargetRefOf(props.editingIncident ?? {})
const lockedTarget = props.lockTarget ? (props.prefill?.target ?? null) : null

const form = useForm({
  occurredAt: props.editingIncident
    ? isoToDatetimeLocalValue(props.editingIncident.occurredAt)
    : '',
  // `occurredAt` is a naive wall-clock: the server needs the browser offset to
  // store the right instant (#452).
  tzOffsetMinutes: tzOffsetMinutes(),
  type: (props.editingIncident?.type ?? 'other') as IncidentType,
  status: (props.editingIncident?.status ?? 'open') as IncidentStatus,
  location: props.editingIncident?.location ?? '',
  description: props.editingIncident?.description ?? '',
  insuranceClaimed: props.editingIncident?.insuranceClaimed ?? false,
  insuranceClaimRef: props.editingIncident?.insuranceClaimRef ?? '',
  ...incidentTargetColumns(initialTarget),
})

// La cible n'est qu'une vue sur les six colonnes : la changer réécrit toutes
// les FK, ce qui permet aussi de la retirer en édition.
const target = computed<IncidentTargetRef | null>({
  get: () => incidentTargetRefOf(form),
  set: (ref) => Object.assign(form, incidentTargetColumns(ref)),
})

watch(
  () => props.editingIncident,
  (incident) => {
    form.occurredAt = incident ? isoToDatetimeLocalValue(incident.occurredAt) : ''
    form.type = incident?.type ?? 'other'
    form.status = incident?.status ?? 'open'
    form.location = incident?.location ?? ''
    form.description = incident?.description ?? ''
    form.insuranceClaimed = incident?.insuranceClaimed ?? false
    form.insuranceClaimRef = incident?.insuranceClaimRef ?? ''
    target.value = incidentTargetRefOf(incident ?? {})
  }
)

const INCIDENT_STATUSES: IncidentStatus[] = ['open', 'in_progress', 'closed']

const incidentTypeOptions = computed(() =>
  INCIDENT_TYPES.map((type) => ({ value: type, label: t(`incidents.type.${type}`) }))
)

const incidentStatusOptions = computed(() =>
  INCIDENT_STATUSES.map((s) => ({ value: s, label: t(`incidents.status.${s}`) }))
)

const actionUrl = computed(() =>
  props.editingIncident
    ? `/boats/${props.boatId}/incidents/${props.editingIncident.id}`
    : `/boats/${props.boatId}/incidents`
)

function handleSubmit() {
  // Relu à la soumission, pas à la construction : une saisie mise en file part
  // avec le fuseau dans lequel elle a été tapée et n'est jamais recalculée au
  // rejeu (#452, #489)
  form.tzOffsetMinutes = tzOffsetMinutes()

  if (!isOnline.value) {
    enqueue({
      type: props.editingIncident ? UPDATE_INCIDENT_ACTION : CREATE_INCIDENT_ACTION,
      url: actionUrl.value,
      method: props.editingIncident ? 'put' : 'post',
      payload: form.data(),
    })
    emit('close')
    return
  }

  const options = {
    preserveScroll: true,
    onSuccess: () => emit('close'),
  }
  if (props.editingIncident) {
    form.put(actionUrl.value, options)
  } else {
    form.post(actionUrl.value, options)
  }
}
</script>

<template>
  <!-- Toujours rendu dans une modale (onglet, cartes, pages, ajout rapide) qui porte le titre -->
  <div class="space-y-4">
    <form @submit.prevent="handleSubmit">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput
          v-model="form.occurredAt"
          type="datetime-local"
          id="occurredAt"
          name="occurredAt"
          :label="t('incidents.fields.occurredAt')"
          :error="form.errors.occurredAt"
          required
        />

        <!-- Type -->
        <BaseSelect
          v-model="form.type"
          name="type"
          :label="t('incidents.fields.type')"
          :options="incidentTypeOptions"
          :error="form.errors.type"
          required
        />

        <!-- Status (edit only) -->
        <BaseSelect
          v-if="editingIncident"
          v-model="form.status"
          name="status"
          :label="t('incidents.fields.status')"
          :options="incidentStatusOptions"
          :error="form.errors.status"
        />

        <!-- Target: equipment or part (#813) -->
        <IncidentTargetSelect
          v-model:target="target"
          :class="editingIncident ? 'sm:col-span-2' : ''"
          :equipment="equipment"
          :locked-target="lockedTarget"
          :locked-label="prefill?.targetLabel ?? null"
          :error="form.errors.boatEngineId"
        />

        <BaseInput
          v-model="form.location"
          type="text"
          id="location"
          name="location"
          class="sm:col-span-2"
          :label="t('incidents.fields.location')"
          :error="form.errors.location"
        />

        <BaseTextarea
          v-model="form.description"
          name="description"
          :label="t('incidents.fields.description')"
          :error="form.errors.description"
          :rows="3"
          required
          class="sm:col-span-2"
        />

        <IncidentInsuranceFields
          v-model:insurance-claimed="form.insuranceClaimed"
          v-model:insurance-claim-ref="form.insuranceClaimRef"
          :error="form.errors.insuranceClaimRef"
        />
      </div>

      <div class="mt-4 flex items-center justify-end gap-3">
        <BaseButton type="button" variant="ghost" size="sm" @click="emit('close')">
          {{ t('incidents.form.cancel') }}
        </BaseButton>
        <BaseButton type="submit" variant="primary" size="sm" :disabled="form.processing">
          {{ t('incidents.form.submit') }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>
