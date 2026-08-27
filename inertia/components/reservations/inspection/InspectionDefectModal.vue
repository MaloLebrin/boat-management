<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useNetworkStatus } from '~/composables/use_network_status'
import { useOfflineQueue } from '~/composables/use_offline_queue'
import { useT } from '~/composables/use_t'
import {
  EQUIPMENT_ACTION_TYPES,
  EQUIPMENT_REFERENCE_TYPES,
  type EquipmentActionType,
  type EquipmentReferenceType,
} from '#shared/constants/equipment_action'

const props = defineProps<{
  boatId: number
  reservationId: number
  /**
   * Null tant que l'inspection n'existe pas côté serveur (création hors-ligne,
   * hors périmètre v1) : l'ajout de défaut est alors refusé explicitement (#491).
   */
  inspectionId: number | null
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const { t } = useT()
const { isOnline } = useNetworkStatus()
const { enqueue } = useOfflineQueue()

const form = useForm({
  label: '',
  actionType: 'to_repair' as EquipmentActionType,
  equipmentType: '' as EquipmentReferenceType | '',
  notes: '',
  estimatedCost: '',
})

const actionUrl = computed(
  () =>
    `/boats/${props.boatId}/reservations/${props.reservationId}/inspections/${props.inspectionId}/equipment-actions`
)

// Un défaut ne peut viser qu'une inspection déjà créée en ligne — refuser
// explicitement vaut mieux qu'un échec silencieux au rejeu (#491)
const offlineUnavailable = computed(() => !isOnline.value && !props.inspectionId)

const actionTypeOptions = computed(() =>
  EQUIPMENT_ACTION_TYPES.map((type) => ({
    value: type,
    label: t(`equipmentActions.actionType.${type}`),
  }))
)

const equipmentTypeOptions = computed(() =>
  EQUIPMENT_REFERENCE_TYPES.map((type) => ({
    value: type,
    label: t(`equipmentActions.equipmentType.${type}`),
  }))
)

/** Les champs optionnels vides sont omis, comme les strippait l'envoi `<Form>`. */
function cleanPayload(): Record<string, unknown> {
  return {
    label: form.label,
    actionType: form.actionType,
    ...(form.equipmentType ? { equipmentType: form.equipmentType } : {}),
    ...(form.notes ? { notes: form.notes } : {}),
    ...(form.estimatedCost !== '' ? { estimatedCost: Number(form.estimatedCost) } : {}),
  }
}

function handleSubmit() {
  if (offlineUnavailable.value) return

  if (!isOnline.value) {
    enqueue({
      type: 'create-inspection-defect',
      url: actionUrl.value,
      method: 'post',
      payload: cleanPayload(),
    })
    close()
    return
  }

  form
    .transform(() => cleanPayload())
    .post(actionUrl.value, {
      preserveScroll: true,
      onSuccess: () => close(),
    })
}

function close() {
  form.reset()
  form.clearErrors()
  emit('update:open', false)
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="t('equipmentActions.defects.addTitle')"
    size="lg"
    @update:open="close"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <p
        v-if="offlineUnavailable"
        class="rounded-md border border-warning/40 bg-surface-muted px-3 py-2 text-sm text-fg"
        role="alert"
      >
        {{ t('equipmentActions.defects.offlineNoInspection') }}
      </p>

      <BaseInput
        id="defect-label"
        v-model="form.label"
        name="label"
        :label="t('equipmentActions.fields.label')"
        :error="form.errors.label"
        required
      />

      <BaseSelect
        id="defect-action-type"
        v-model="form.actionType"
        name="actionType"
        :label="t('equipmentActions.fields.actionType')"
        :options="actionTypeOptions"
        :error="form.errors.actionType"
        required
      />

      <BaseSelect
        id="defect-equipment-type"
        v-model="form.equipmentType"
        name="equipmentType"
        :label="t('equipmentActions.fields.equipmentType')"
        :options="equipmentTypeOptions"
        allow-empty
        :error="form.errors.equipmentType"
      />

      <BaseTextarea
        id="defect-notes"
        v-model="form.notes"
        name="notes"
        :label="t('equipmentActions.fields.notes')"
        :error="form.errors.notes"
        :rows="3"
      />

      <BaseInput
        id="defect-estimated-cost"
        v-model="form.estimatedCost"
        name="estimatedCost"
        type="number"
        step="0.01"
        min="0"
        :label="t('equipmentActions.fields.estimatedCost')"
        :error="form.errors.estimatedCost"
      />

      <div class="flex items-center justify-end gap-2 pt-2">
        <BaseButton variant="ghost" type="button" @click="close">
          {{ t('equipmentActions.form.cancel') }}
        </BaseButton>
        <BaseButton type="submit" :disabled="form.processing || offlineUnavailable">
          {{ t('equipmentActions.form.submit') }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
