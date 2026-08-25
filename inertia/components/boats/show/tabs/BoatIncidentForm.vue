<script setup lang="ts">
import { computed, watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useNetworkStatus } from '~/composables/use_network_status'
import { useOfflineQueue } from '~/composables/use_offline_queue'
import { useT } from '~/composables/use_t'
import { isoToDatetimeLocalValue, tzOffsetMinutes } from '~/utils/local_datetime'
import type { BoatIncidentRow, IncidentStatus, IncidentType } from '~/types/boat_show'

const props = defineProps<{
  boatId: number
  editingIncident: BoatIncidentRow | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useT()
const { isOnline } = useNetworkStatus()
const { enqueue } = useOfflineQueue()

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
  }
)

const INCIDENT_TYPES: IncidentType[] = [
  'grounding',
  'flooding',
  'rigging_failure',
  'engine_failure',
  'collision',
  'fire',
  'theft_vandalism',
  'other',
]

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
      type: props.editingIncident ? 'update-incident' : 'create-incident',
      url: actionUrl.value,
      method: props.editingIncident ? 'put' : 'post',
      payload: form.data() as unknown as Record<string, unknown>,
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
  <div class="rounded-lg border border-border bg-surface-elevated p-6 space-y-4">
    <h3 class="font-semibold text-fg">
      {{ editingIncident ? t('incidents.form.editTitle') : t('incidents.form.createTitle') }}
    </h3>

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

        <BaseInput
          v-model="form.location"
          type="text"
          id="location"
          name="location"
          :class="editingIncident ? '' : 'sm:col-span-2'"
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

        <!-- Insurance -->
        <div class="sm:col-span-2 flex items-center gap-3">
          <input
            id="insuranceClaimed"
            v-model="form.insuranceClaimed"
            type="checkbox"
            name="insuranceClaimed"
            class="h-4 w-4 rounded border-border text-brand focus:ring-brand"
          />
          <label for="insuranceClaimed" class="text-sm text-fg">
            {{ t('incidents.fields.insuranceClaimed') }}
          </label>
        </div>

        <BaseInput
          v-model="form.insuranceClaimRef"
          type="text"
          id="insuranceClaimRef"
          name="insuranceClaimRef"
          class="sm:col-span-2"
          :label="t('incidents.fields.insuranceClaimRef')"
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
