<script setup lang="ts">
import { computed } from 'vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'
import { BATTERY_CHEMISTRIES } from '#shared/constants/tanks'

defineProps<{
  name: string
  chemistry: string
  capacityAh: string
  nominalVoltage: string
  lowVoltageV: string
  instrumentKey: string
  errors: Record<string, string | undefined>
}>()

const emit = defineEmits<{
  (e: 'update:name', value: string): void
  (e: 'update:chemistry', value: string): void
  (e: 'update:capacityAh', value: string): void
  (e: 'update:nominalVoltage', value: string): void
  (e: 'update:lowVoltageV', value: string): void
  (e: 'update:instrumentKey', value: string): void
}>()

const { t } = useT()

const chemistryOptions = computed(() =>
  BATTERY_CHEMISTRIES.map((c) => ({
    value: c,
    label: t(`boats.batteries.chemistry.${c}`),
  }))
)
</script>

<template>
  <BaseInput
    :model-value="name"
    :label="t('boats.batteries.fields.name')"
    name="name"
    required
    :error="errors.name"
    @update:model-value="emit('update:name', $event)"
  />
  <BaseSelect
    :model-value="chemistry"
    :label="t('boats.batteries.fields.chemistry')"
    name="chemistry"
    :options="chemistryOptions"
    :placeholder="t('common.optional')"
    allow-empty
    :error="errors.chemistry"
    @update:model-value="emit('update:chemistry', String($event ?? ''))"
  />
  <BaseInput
    :model-value="capacityAh"
    :label="t('boats.batteries.fields.capacityAh')"
    name="capacityAh"
    type="number"
    :placeholder="t('common.optional')"
    :error="errors.capacityAh"
    @update:model-value="emit('update:capacityAh', $event)"
  />
  <BaseInput
    :model-value="nominalVoltage"
    :label="t('boats.batteries.fields.nominalVoltage')"
    name="nominalVoltage"
    type="number"
    :placeholder="t('common.optional')"
    :error="errors.nominalVoltage"
    @update:model-value="emit('update:nominalVoltage', $event)"
  />
  <BaseInput
    :model-value="lowVoltageV"
    :label="t('boats.batteries.fields.lowVoltageV')"
    name="lowVoltageV"
    type="number"
    step="0.1"
    :placeholder="t('common.optional')"
    :hint="t('boats.batteries.fields.lowVoltageHint')"
    :error="errors.lowVoltageV"
    @update:model-value="emit('update:lowVoltageV', $event)"
  />
  <BaseInput
    :model-value="instrumentKey"
    :label="t('boats.batteries.fields.instrumentKey')"
    name="instrumentKey"
    :placeholder="t('common.optional')"
    :hint="t('boats.batteries.fields.instrumentKeyHint')"
    :error="errors.instrumentKey"
    @update:model-value="emit('update:instrumentKey', $event)"
  />
</template>
