<script setup lang="ts">
import { ref, watch } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'
import type {
  BoatIncidentRow,
  BoatShowDetail,
  IncidentStatus,
  IncidentType,
} from '~/types/boat_show'

const props = defineProps<{
  boat: BoatShowDetail
  editingIncident: BoatIncidentRow | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useT()

const formType = ref<IncidentType>(props.editingIncident?.type ?? 'other')
const formStatus = ref<IncidentStatus>(props.editingIncident?.status ?? 'open')
const occurredAt = ref(
  props.editingIncident ? toLocalDatetime(props.editingIncident.occurredAt) : ''
)
const location = ref(props.editingIncident?.location ?? '')
const insuranceClaimRef = ref(props.editingIncident?.insuranceClaimRef ?? '')

watch(
  () => props.editingIncident,
  (incident) => {
    formType.value = incident?.type ?? 'other'
    formStatus.value = incident?.status ?? 'open'
    occurredAt.value = incident ? toLocalDatetime(incident.occurredAt) : ''
    location.value = incident?.location ?? ''
    insuranceClaimRef.value = incident?.insuranceClaimRef ?? ''
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

function toLocalDatetime(utcIso: string): string {
  const d = new Date(utcIso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
</script>

<template>
  <div class="rounded-lg border border-border bg-surface-elevated p-6 space-y-4">
    <h3 class="font-semibold text-fg">
      {{ editingIncident ? t('incidents.form.editTitle') : t('incidents.form.createTitle') }}
    </h3>

    <Form
      :action="{
        url: editingIncident
          ? `/boats/${boat.id}/incidents/${editingIncident.id}`
          : `/boats/${boat.id}/incidents`,
        method: editingIncident ? 'put' : 'post',
      }"
      #default="{ processing, errors }"
    >
      <input type="hidden" name="tzOffsetMinutes" :value="String(new Date().getTimezoneOffset())" />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput
          v-model="occurredAt"
          type="datetime-local"
          id="occurredAt"
          name="occurredAt"
          :label="t('incidents.fields.occurredAt')"
          :error="errors.occurredAt"
          required
        />

        <!-- Type -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('incidents.fields.type') }}
          </label>
          <select
            v-model="formType"
            name="type"
            required
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option v-for="incType in INCIDENT_TYPES" :key="incType" :value="incType">
              {{ t(`incidents.type.${incType}`) }}
            </option>
          </select>
        </div>

        <!-- Status (edit only) -->
        <div v-if="editingIncident">
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('incidents.fields.status') }}
          </label>
          <select
            v-model="formStatus"
            name="status"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option v-for="s in INCIDENT_STATUSES" :key="s" :value="s">
              {{ t(`incidents.status.${s}`) }}
            </option>
          </select>
        </div>

        <BaseInput
          v-model="location"
          type="text"
          id="location"
          name="location"
          :class="editingIncident ? '' : 'sm:col-span-2'"
          :label="t('incidents.fields.location')"
          :error="errors.location"
        />

        <BaseTextarea
          name="description"
          :model-value="editingIncident?.description ?? ''"
          :label="t('incidents.fields.description')"
          :errors="errors"
          :rows="3"
          required
          class="sm:col-span-2"
        />

        <!-- Insurance -->
        <div class="sm:col-span-2 flex items-center gap-3">
          <input
            id="insuranceClaimed"
            type="checkbox"
            name="insuranceClaimed"
            :checked="editingIncident?.insuranceClaimed ?? false"
            class="h-4 w-4 rounded border-border text-brand focus:ring-brand"
          />
          <label for="insuranceClaimed" class="text-sm text-fg">
            {{ t('incidents.fields.insuranceClaimed') }}
          </label>
        </div>

        <BaseInput
          v-model="insuranceClaimRef"
          type="text"
          id="insuranceClaimRef"
          name="insuranceClaimRef"
          class="sm:col-span-2"
          :label="t('incidents.fields.insuranceClaimRef')"
          :error="errors.insuranceClaimRef"
        />
      </div>

      <div class="mt-4 flex items-center justify-end gap-3">
        <BaseButton type="button" variant="ghost" size="sm" @click="emit('close')">
          {{ t('incidents.form.cancel') }}
        </BaseButton>
        <BaseButton type="submit" variant="primary" size="sm" :disabled="processing">
          {{ t('incidents.form.submit') }}
        </BaseButton>
      </div>
    </Form>
  </div>
</template>
