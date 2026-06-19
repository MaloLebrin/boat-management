<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { router } from '@inertiajs/vue3'
import { ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import type { BoatIncidentRow, BoatShowDetail, IncidentStatus, IncidentType } from '~/types/boat_show'

const props = defineProps<{
  boat: BoatShowDetail
  incidents: BoatIncidentRow[]
  canManage: boolean
}>()

const { t } = useT()

const showForm = ref(false)
const editingIncident = ref<BoatIncidentRow | null>(null)
const formType = ref<IncidentType>('other')
const formStatus = ref<IncidentStatus>('open')

const STATUS_COLORS: Record<IncidentStatus, string> = {
  open: 'bg-coral-50 text-coral-700 border-coral-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  closed: 'bg-surface-muted text-fg-muted border-border',
}

const STATUS_DOT: Record<IncidentStatus, string> = {
  open: 'bg-coral-500',
  in_progress: 'bg-amber-500',
  closed: 'bg-fg-subtle',
}

function formatDate(iso: string): string {
  return iso.slice(0, 10)
}

function openCreate() {
  editingIncident.value = null
  formType.value = 'other'
  formStatus.value = 'open'
  showForm.value = true
}

function openEdit(incident: BoatIncidentRow) {
  editingIncident.value = incident
  formType.value = incident.type
  formStatus.value = incident.status
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingIncident.value = null
}

function deleteIncident(incidentId: number) {
  if (!window.confirm(t('incidents.form.confirmDelete'))) return
  router.delete(`/boats/${props.boat.id}/incidents/${incidentId}`, { preserveScroll: true })
}

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
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-fg-muted">
        {{ t('incidents.count', { count: String(incidents.length) }) }}
      </p>
      <BaseButton v-if="canManage" variant="primary" size="sm" type="button" @click="openCreate">
        + {{ t('incidents.addIncident') }}
      </BaseButton>
    </div>

    <!-- Create / Edit form -->
    <div
      v-if="showForm"
      class="rounded-lg border border-border bg-surface-elevated p-6 space-y-4"
    >
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
        #default="{ processing }"
      >
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <!-- Date -->
          <div>
            <label class="block text-sm font-medium text-fg mb-1">
              {{ t('incidents.fields.occurredAt') }}
            </label>
            <input
              type="datetime-local"
              name="occurredAt"
              :value="editingIncident ? editingIncident.occurredAt.slice(0, 16) : ''"
              required
              class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

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

          <!-- Location -->
          <div :class="editingIncident ? '' : 'sm:col-span-2'">
            <label class="block text-sm font-medium text-fg mb-1">
              {{ t('incidents.fields.location') }}
            </label>
            <input
              type="text"
              name="location"
              :value="editingIncident?.location ?? ''"
              class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <!-- Description -->
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-fg mb-1">
              {{ t('incidents.fields.description') }}
            </label>
            <textarea
              name="description"
              :value="editingIncident?.description ?? ''"
              rows="3"
              required
              class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand resize-none"
            />
          </div>

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

          <!-- Insurance ref -->
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-fg mb-1">
              {{ t('incidents.fields.insuranceClaimRef') }}
            </label>
            <input
              type="text"
              name="insuranceClaimRef"
              :value="editingIncident?.insuranceClaimRef ?? ''"
              class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>

        <div class="mt-4 flex items-center justify-end gap-3">
          <BaseButton type="button" variant="ghost" size="sm" @click="closeForm">
            {{ t('incidents.form.cancel') }}
          </BaseButton>
          <BaseButton type="submit" variant="primary" size="sm" :disabled="processing">
            {{ t('incidents.form.submit') }}
          </BaseButton>
        </div>
      </Form>
    </div>

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
            <!-- Type + status badge -->
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <span class="font-semibold text-fg">
                {{ t(`incidents.type.${incident.type}`) }}
              </span>
              <span
                :class="[
                  'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
                  STATUS_COLORS[incident.status],
                ]"
              >
                <span :class="['h-1.5 w-1.5 rounded-full', STATUS_DOT[incident.status]]" />
                {{ t(`incidents.status.${incident.status}`) }}
              </span>
              <span v-if="incident.insuranceClaimed" class="text-xs text-fg-muted">
                {{ t('incidents.insuranceDeclared') }}
                <span v-if="incident.insuranceClaimRef">#{{ incident.insuranceClaimRef }}</span>
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
          <div v-if="canManage" class="flex items-center gap-2 shrink-0">
            <BaseButton
              type="button"
              variant="ghost"
              size="sm"
              @click="openEdit(incident)"
            >
              {{ t('incidents.form.edit') }}
            </BaseButton>
            <BaseButton
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
      v-else-if="!showForm"
      class="rounded-lg border border-dashed border-border bg-surface-muted/30 p-8 text-center"
    >
      <p class="text-fg-muted">{{ t('incidents.empty') }}</p>
      <BaseButton
        v-if="canManage"
        variant="secondary"
        size="sm"
        type="button"
        class="mt-4"
        @click="openCreate"
      >
        + {{ t('incidents.addIncident') }}
      </BaseButton>
    </div>
  </div>
</template>
