<script setup lang="ts">
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useBoatOptions } from '~/composables/useBoatOptions'
import { useT } from '~/composables/useT'

defineProps<{
  errors: Record<string, string | string[] | undefined>
  equipmentType?: string
  quantity?: string
  expiryDate?: string
  status?: string
  notes?: string
}>()

const { t } = useT()
const { safetyEquipmentTypeOptions, safetyEquipmentStatusOptions } = useBoatOptions()
</script>

<template>
  <div class="space-y-4">
    <BaseSelect
      id="equipmentType"
      name="equipmentType"
      :label="t('boats.safetyEquipment.equipmentType')"
      :options="safetyEquipmentTypeOptions"
      :model-value="equipmentType"
      :errors="errors"
    />
    <div class="grid grid-cols-2 gap-4">
      <BaseInput
        id="quantity"
        name="quantity"
        :label="t('boats.safetyEquipment.quantity')"
        type="number"
        inputmode="numeric"
        :model-value="quantity"
        :errors="errors"
      />
      <BaseInput
        id="expiryDate"
        name="expiryDate"
        :label="t('boats.safetyEquipment.expiryDate')"
        type="date"
        :model-value="expiryDate"
        :errors="errors"
      />
    </div>
    <BaseSelect
      id="status"
      name="status"
      :label="t('boats.safetyEquipment.status')"
      :options="safetyEquipmentStatusOptions"
      :model-value="status"
      :errors="errors"
    />
    <BaseInput
      id="notes"
      name="notes"
      :label="t('equipment.notes.label')"
      :placeholder="t('equipment.notes.placeholder')"
      :model-value="notes"
      :errors="errors"
    />
  </div>
</template>
