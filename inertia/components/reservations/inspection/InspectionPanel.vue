<script setup lang="ts">
import { ref } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import InspectionPhotos from '~/components/reservations/inspection/InspectionPhotos.vue'
import InspectionDefects from '~/components/reservations/inspection/InspectionDefects.vue'
import { useT } from '~/composables/use_t'
import type { InspectionKind, InspectionWithPhotos } from '~/types/inspection'

const props = defineProps<{
  boatId: number
  reservationId: number
  kind: InspectionKind
  inspection: InspectionWithPhotos | null
  canEdit: boolean
  canDelete: boolean
  canManageActions: boolean
  canDeleteActions: boolean
}>()

const { t } = useT()

const basePath = `/boats/${props.boatId}/reservations/${props.reservationId}`

const performedAt = ref(props.inspection ? toLocalDatetime(props.inspection.performedAt) : '')
const fuelLevel = ref(props.inspection?.fuelLevel?.toString() ?? '')
const engineHours = ref(props.inspection?.engineHours ?? '')
const notes = ref(props.inspection?.notes ?? '')

function toLocalDatetime(utcIso: string): string {
  const d = new Date(utcIso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function deleteInspection() {
  if (!props.inspection) return
  if (!window.confirm(t('inspections.form.confirmDelete'))) return
  router.delete(`${basePath}/inspections/${props.inspection.id}`, { preserveScroll: true })
}
</script>

<template>
  <BaseCard class="space-y-4 p-5">
    <div class="flex items-center justify-between">
      <h3 class="font-semibold text-fg">{{ t(`inspections.kind.${kind}`) }}</h3>
      <BaseButton
        v-if="inspection && canDelete"
        variant="danger"
        size="sm"
        type="button"
        @click="deleteInspection"
      >
        {{ t('inspections.form.delete') }}
      </BaseButton>
    </div>

    <Form
      v-if="canEdit"
      :action="{
        url: inspection ? `${basePath}/inspections/${inspection.id}` : `${basePath}/inspections`,
        method: inspection ? 'put' : 'post',
      }"
      #default="{ processing, errors }"
    >
      <input v-if="!inspection" type="hidden" name="kind" :value="kind" />
      <input type="hidden" name="tzOffsetMinutes" :value="String(new Date().getTimezoneOffset())" />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput
          v-model="performedAt"
          type="datetime-local"
          id="performedAt"
          name="performedAt"
          :label="t('inspections.fields.performedAt')"
          :error="errors.performedAt"
          required
        />
        <BaseInput
          v-model="fuelLevel"
          type="number"
          min="0"
          max="100"
          id="fuelLevel"
          name="fuelLevel"
          :label="t('inspections.fields.fuelLevel')"
          :error="errors.fuelLevel"
        />
        <BaseInput
          v-model="engineHours"
          type="number"
          min="0"
          step="0.1"
          id="engineHours"
          name="engineHours"
          :label="t('inspections.fields.engineHours')"
          :error="errors.engineHours"
        />
        <BaseTextarea
          v-model="notes"
          name="notes"
          :label="t('inspections.fields.notes')"
          :errors="errors"
          :rows="2"
          class="sm:col-span-2"
        />
      </div>

      <div class="mt-4 flex justify-end">
        <BaseButton type="submit" variant="primary" size="sm" :disabled="processing">
          {{ t('inspections.form.submit') }}
        </BaseButton>
      </div>
    </Form>

    <p v-else-if="!inspection" class="text-sm text-fg-muted">
      {{ t(`inspections.empty.${kind}`) }}
    </p>

    <InspectionPhotos
      v-if="inspection"
      :upload-url="`${basePath}/inspections/${inspection.id}/photos`"
      :delete-url-for="
        (mediaId: number) => `${basePath}/inspections/${inspection!.id}/photos/${mediaId}`
      "
      :photos="inspection.photos"
      :can-upload="canEdit"
      :can-delete="canDelete"
    />

    <InspectionDefects
      v-if="inspection"
      :boat-id="boatId"
      :reservation-id="reservationId"
      :inspection-id="inspection.id"
      :actions="inspection.actions"
      :can-manage="canManageActions"
      :can-delete="canDeleteActions"
    />
  </BaseCard>
</template>
