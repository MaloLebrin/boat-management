<script setup lang="ts">
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useBoatOptions } from '~/composables/use_boat_options'
import { useT } from '~/composables/use_t'

defineProps<{
  errors: Record<string, string | string[] | undefined>
  equipmentType?: string
  quantity?: string
  expiryDate?: string
  status?: string
  notes?: string
  purchasePrice?: string
  purchasedAt?: string
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
    <div class="grid grid-cols-2 gap-4">
      <BaseInput
        id="purchasePrice"
        name="purchasePrice"
        :label="t('equipment.purchasePrice.label')"
        type="number"
        step="0.01"
        min="0"
        :model-value="purchasePrice"
        :errors="errors"
      />
      <BaseInput
        id="purchasedAt"
        name="purchasedAt"
        :label="t('equipment.purchasedAt.label')"
        type="date"
        :model-value="purchasedAt"
        :errors="errors"
      />
    </div>
  </div>
</template>
