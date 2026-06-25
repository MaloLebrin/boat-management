<script setup lang="ts">
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useBoatOptions } from '~/composables/use_boat_options'
import { useT } from '~/composables/use_t'

defineProps<{
  errors: Record<string, string | string[] | undefined>
  name?: string
  brand?: string
  model?: string
  quantity?: string
  status?: string
  notes?: string
  purchasePrice?: string
  purchasedAt?: string
}>()

const { t } = useT()
const { genericEquipmentStatusOptions } = useBoatOptions()
</script>

<template>
  <div class="space-y-4">
    <BaseInput
      id="name"
      name="name"
      :label="t('boats.genericEquipment.name.label')"
      :placeholder="t('boats.genericEquipment.name.placeholder')"
      :model-value="name"
      :errors="errors"
      required
    />
    <div class="grid grid-cols-2 gap-4">
      <BaseInput
        id="brand"
        name="brand"
        :label="t('boats.genericEquipment.brand.label')"
        :placeholder="t('boats.genericEquipment.brand.placeholder')"
        :model-value="brand"
        :errors="errors"
      />
      <BaseInput
        id="model"
        name="model"
        :label="t('boats.genericEquipment.model.label')"
        :placeholder="t('boats.genericEquipment.model.placeholder')"
        :model-value="model"
        :errors="errors"
      />
    </div>
    <div class="grid grid-cols-2 gap-4">
      <BaseInput
        id="quantity"
        name="quantity"
        :label="t('boats.genericEquipment.quantity')"
        type="number"
        inputmode="numeric"
        :model-value="quantity"
        :errors="errors"
      />
      <BaseSelect
        id="status"
        name="status"
        :label="t('boats.genericEquipment.status')"
        :options="genericEquipmentStatusOptions"
        :model-value="status"
        :errors="errors"
      />
    </div>
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
