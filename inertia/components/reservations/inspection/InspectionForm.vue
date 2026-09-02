<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useNetworkStatus } from '~/composables/use_network_status'
import { newTempId, useOfflineQueue } from '~/composables/use_offline_queue'
import type { PendingInspection } from '~/composables/use_pending_inspection'
import { useT } from '~/composables/use_t'
import { isoToDatetimeLocalValue, tzOffsetMinutes } from '~/utils/local_datetime'
import type { InspectionKind, InspectionWithPhotos } from '~/types/inspection'
import { CREATE_INSPECTION_ACTION, UPDATE_INSPECTION_ACTION } from '#shared/constants/offline_queue'

const props = defineProps<{
  boatId: number
  reservationId: number
  kind: InspectionKind
  /** Inspection déjà en base — le formulaire passe alors en modification. */
  inspection: InspectionWithPhotos | null
  /** Saisie hors-ligne encore en file (#622) : le formulaire la ré-édite. */
  pending: PendingInspection | null
}>()

const { t } = useT()
const { isOnline } = useNetworkStatus()
const { enqueue } = useOfflineQueue()

const basePath = `/boats/${props.boatId}/reservations/${props.reservationId}`
const updateUrl = computed(() => `${basePath}/inspections/${props.inspection?.id}`)

const form = useForm({
  performedAt: props.inspection
    ? isoToDatetimeLocalValue(props.inspection.performedAt)
    : (props.pending?.performedAt ?? ''),
  fuelLevel: (props.inspection?.fuelLevel ?? props.pending?.fuelLevel)?.toString() ?? '',
  engineHours: props.inspection?.engineHours ?? props.pending?.engineHours ?? '',
  notes: props.inspection?.notes ?? props.pending?.notes ?? '',
  tzOffsetMinutes: tzOffsetMinutes(),
})

/**
 * Les champs optionnels vides sont omis — un `''` échouerait la validation
 * numérique, là où l'envoi `<Form>` natif les strippait.
 */
function cleanPayload(): Record<string, unknown> {
  return {
    ...(props.inspection ? {} : { kind: props.kind }),
    performedAt: form.performedAt,
    tzOffsetMinutes: form.tzOffsetMinutes,
    ...(form.fuelLevel !== '' ? { fuelLevel: Number(form.fuelLevel) } : {}),
    ...(form.engineHours !== '' ? { engineHours: Number(form.engineHours) } : {}),
    ...(form.notes ? { notes: form.notes } : {}),
  }
}

function handleSubmit() {
  // Relu à la soumission, pas à la construction : une saisie mise en file part
  // avec le fuseau dans lequel elle a été tapée (#452)
  form.tzOffsetMinutes = tzOffsetMinutes()

  if (!isOnline.value) {
    if (props.inspection) {
      // Le PUT sera rejoué plus tard : `_expectedUpdatedAt` évite d'écraser en
      // silence une modification faite entre-temps (#622)
      enqueue({
        type: UPDATE_INSPECTION_ACTION,
        url: updateUrl.value,
        method: 'put',
        payload: { ...cleanPayload(), _expectedUpdatedAt: props.inspection.updatedAt },
        dedupeKey: `${UPDATE_INSPECTION_ACTION}:${updateUrl.value}`,
      })
      return
    }

    enqueue({
      type: CREATE_INSPECTION_ACTION,
      url: `${basePath}/inspections`,
      method: 'post',
      payload: cleanPayload(),
      // Ré-éditer un état des lieux encore en file met à jour la même action :
      // le jeton temporaire est conservé, les défauts rattachés restent liés.
      dedupeKey: `${CREATE_INSPECTION_ACTION}:${basePath}:${props.kind}`,
      tempId: props.pending?.id ?? newTempId(),
    })
    return
  }

  const options = { preserveScroll: true }
  if (props.inspection) {
    form.transform(cleanPayload).put(updateUrl.value, options)
  } else {
    form.transform(cleanPayload).post(`${basePath}/inspections`, options)
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BaseInput
        v-model="form.performedAt"
        type="datetime-local"
        id="performedAt"
        name="performedAt"
        :label="t('inspections.fields.performedAt')"
        :error="form.errors.performedAt"
        required
      />
      <BaseInput
        v-model="form.fuelLevel"
        type="number"
        min="0"
        max="100"
        id="fuelLevel"
        name="fuelLevel"
        :label="t('inspections.fields.fuelLevel')"
        :error="form.errors.fuelLevel"
      />
      <BaseInput
        v-model="form.engineHours"
        type="number"
        min="0"
        step="0.1"
        id="engineHours"
        name="engineHours"
        :label="t('inspections.fields.engineHours')"
        :error="form.errors.engineHours"
      />
      <BaseTextarea
        v-model="form.notes"
        name="notes"
        :label="t('inspections.fields.notes')"
        :errors="form.errors"
        :rows="2"
        class="sm:col-span-2"
      />
    </div>

    <div class="mt-4 flex justify-end">
      <BaseButton type="submit" variant="primary" size="sm" :disabled="form.processing">
        {{ t('inspections.form.submit') }}
      </BaseButton>
    </div>
  </form>
</template>
