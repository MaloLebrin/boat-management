<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
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
  inspectionId: number
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const { t } = useT()

const label = ref('')
const actionType = ref<EquipmentActionType>('to_repair')
const notes = ref('')
const estimatedCost = ref('')
const equipmentType = ref<EquipmentReferenceType | ''>('')

const actionUrl = computed(
  () =>
    `/boats/${props.boatId}/reservations/${props.reservationId}/inspections/${props.inspectionId}/equipment-actions`
)

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

function close() {
  label.value = ''
  actionType.value = 'to_repair'
  notes.value = ''
  estimatedCost.value = ''
  equipmentType.value = ''
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
    <Form
      :action="{ url: actionUrl, method: 'post' }"
      @success="close"
      class="space-y-4"
      #default="{ processing, errors }"
    >
      <BaseInput
        id="defect-label"
        v-model="label"
        name="label"
        :label="t('equipmentActions.fields.label')"
        :errors="errors"
        required
      />

      <BaseSelect
        id="defect-action-type"
        v-model="actionType"
        name="actionType"
        :label="t('equipmentActions.fields.actionType')"
        :options="actionTypeOptions"
        :errors="errors"
        required
      />

      <BaseSelect
        id="defect-equipment-type"
        v-model="equipmentType"
        name="equipmentType"
        :label="t('equipmentActions.fields.equipmentType')"
        :options="equipmentTypeOptions"
        allow-empty
        :errors="errors"
      />

      <BaseTextarea
        id="defect-notes"
        v-model="notes"
        name="notes"
        :label="t('equipmentActions.fields.notes')"
        :errors="errors"
        :rows="3"
      />

      <BaseInput
        id="defect-estimated-cost"
        v-model="estimatedCost"
        name="estimatedCost"
        type="number"
        step="0.01"
        min="0"
        :label="t('equipmentActions.fields.estimatedCost')"
        :errors="errors"
      />

      <div class="flex items-center justify-end gap-2 pt-2">
        <BaseButton variant="ghost" type="button" @click="close">
          {{ t('equipmentActions.form.cancel') }}
        </BaseButton>
        <BaseButton type="submit" :disabled="processing">
          {{ t('equipmentActions.form.submit') }}
        </BaseButton>
      </div>
    </Form>
  </BaseModal>
</template>
