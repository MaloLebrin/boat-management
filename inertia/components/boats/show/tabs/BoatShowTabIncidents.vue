<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BoatIncidentForm from '~/components/boats/show/tabs/BoatIncidentForm.vue'
import { useT } from '~/composables/use_t'
import type { BoatIncidentRow, BoatShowDetail, IncidentStatus } from '~/types/boat_show'

const props = defineProps<{
  boat: BoatShowDetail
  incidents: BoatIncidentRow[]
  canManage: boolean
  canDelete: boolean
}>()

const { t } = useT()

const showForm = ref(false)
const editingIncident = ref<BoatIncidentRow | null>(null)

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
  showForm.value = true
}

function openEdit(incident: BoatIncidentRow) {
  editingIncident.value = incident
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
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-fg-muted">
        {{ t('incidents.count', { count: String(incidents.length) }) }}
      </p>
      <BaseButton v-if="canManage" variant="primary" size="sm" type="button" @click="openCreate">
        {{ t('incidents.addIncident') }}
      </BaseButton>
    </div>

    <!-- Create / Edit form -->
    <BoatIncidentForm
      v-if="showForm"
      :boat="boat"
      :editing-incident="editingIncident"
      @close="closeForm"
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
            <BaseButton type="button" variant="ghost" size="sm" @click="openEdit(incident)">
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
        {{ t('incidents.addIncident') }}
      </BaseButton>
    </div>
  </div>
</template>
