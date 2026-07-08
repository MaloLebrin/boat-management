<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { computed, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'
import {
  EQUIPMENT_ACTION_STATUSES,
  EQUIPMENT_ACTION_TYPES,
  type EquipmentActionStatus,
  type EquipmentActionType,
  type EquipmentReferenceType,
} from '#shared/constants/equipment_action'
import type {
  BoatEquipmentActionRow,
  BoatShowDetail,
  EquipmentActionPrefill,
} from '~/types/boat_show'

const props = withDefaults(
  defineProps<{
    boat: BoatShowDetail
    open: boolean
    editingAction: BoatEquipmentActionRow | null
    /** Seed for a new action raised from an equipment card (#313). */
    prefill?: EquipmentActionPrefill | null
  }>(),
  { prefill: null }
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const { t } = useT()

const ACTION_TYPES = EQUIPMENT_ACTION_TYPES
const STATUSES = EQUIPMENT_ACTION_STATUSES

const label = ref('')
const actionType = ref<EquipmentActionType>('to_buy')
const notes = ref('')
const estimatedCost = ref<string>('')
const actualCost = ref<string>('')
const status = ref<EquipmentActionStatus>('pending')
const equipmentType = ref<EquipmentReferenceType | null>(null)
const equipmentId = ref<number | null>(null)

function resetForm(action: BoatEquipmentActionRow | null) {
  if (action) {
    label.value = action.label
    actionType.value = action.actionType
    notes.value = action.notes ?? ''
    estimatedCost.value = action.estimatedCost !== null ? String(action.estimatedCost) : ''
    actualCost.value = action.actualCost !== null ? String(action.actualCost) : ''
    status.value = action.status
    equipmentType.value = action.equipmentType
    equipmentId.value = action.equipmentId
  } else {
    // Create: seed from the prefill (#313) when present, otherwise blank defaults.
    label.value = props.prefill?.label ?? ''
    actionType.value = props.prefill?.actionType ?? 'to_buy'
    notes.value = ''
    estimatedCost.value = ''
    actualCost.value = ''
    status.value = 'pending'
    equipmentType.value = props.prefill?.equipmentType ?? null
    equipmentId.value = props.prefill?.equipmentId ?? null
  }
}

watch(() => props.editingAction, resetForm, { immediate: true })

// Re-seed each time the modal opens so a fresh prefill (or a blank create) applies.
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) resetForm(props.editingAction)
  }
)

const actionTypeOptions = computed(() =>
  ACTION_TYPES.map((type) => ({
    value: type,
    label: t(`equipmentActions.actionType.${type}`),
  }))
)

const statusOptions = computed(() =>
  STATUSES.map((s) => ({
    value: s,
    label: t(`equipmentActions.status.${s}`),
  }))
)

const formAction = computed(() => ({
  url: props.editingAction
    ? `/boats/${props.boat.id}/equipment-actions/${props.editingAction.id}`
    : `/boats/${props.boat.id}/equipment-actions`,
  method: props.editingAction ? ('put' as const) : ('post' as const),
}))

const modalTitle = computed(() =>
  props.editingAction
    ? t('equipmentActions.form.editTitle')
    : t('equipmentActions.form.createTitle')
)

function close() {
  emit('update:open', false)
}
</script>

<template>
  <BaseModal :open="open" :title="modalTitle" :subtitle="boat.name" size="lg" @update:open="close">
    <Form :action="formAction" @success="close" class="space-y-4" #default="{ processing, errors }">
      <!-- Link back to the source equipment when raised from a card (#313) -->
      <template v-if="!editingAction && equipmentId !== null">
        <input type="hidden" name="equipmentType" :value="equipmentType" />
        <input type="hidden" name="equipmentId" :value="equipmentId" />
      </template>

      <BaseInput
        id="action-label"
        v-model="label"
        name="label"
        :label="t('equipmentActions.fields.label')"
        :errors="errors"
        required
      />

      <BaseSelect
        id="action-type"
        v-model="actionType"
        name="actionType"
        :label="t('equipmentActions.fields.actionType')"
        :options="actionTypeOptions"
        :errors="errors"
        required
      />

      <BaseTextarea
        id="action-notes"
        v-model="notes"
        name="notes"
        :label="t('equipmentActions.fields.notes')"
        :errors="errors"
        :rows="3"
      />

      <BaseInput
        id="action-estimated-cost"
        v-model="estimatedCost"
        name="estimatedCost"
        type="number"
        step="0.01"
        min="0"
        :label="t('equipmentActions.fields.estimatedCost')"
        :errors="errors"
      />

      <template v-if="editingAction">
        <BaseInput
          id="action-actual-cost"
          v-model="actualCost"
          name="actualCost"
          type="number"
          step="0.01"
          min="0"
          :label="t('equipmentActions.fields.actualCost')"
          :errors="errors"
        />

        <BaseSelect
          id="action-status"
          v-model="status"
          name="status"
          :label="t('equipmentActions.fields.status')"
          :options="statusOptions"
          :errors="errors"
        />
      </template>

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
