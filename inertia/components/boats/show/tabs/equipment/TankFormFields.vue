<script setup lang="ts">
import { computed } from 'vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'
import { TANK_TYPES } from '#shared/constants/tanks'

defineProps<{
  name: string
  type: string
  capacityL: string
  lowLevelPct: string
  instrumentKey: string
  errors: Record<string, string | undefined>
}>()

const emit = defineEmits<{
  (e: 'update:name', value: string): void
  (e: 'update:type', value: string): void
  (e: 'update:capacityL', value: string): void
  (e: 'update:lowLevelPct', value: string): void
  (e: 'update:instrumentKey', value: string): void
}>()

const { t } = useT()

const tankTypeOptions = computed(() =>
  TANK_TYPES.map((type) => ({
    value: type,
    label: t(`boats.tanks.type.${type}`),
  }))
)
</script>

<template>
  <BaseInput
    :model-value="name"
    :label="t('boats.tanks.fields.name')"
    name="name"
    required
    :error="errors.name"
    @update:model-value="emit('update:name', $event)"
  />
  <BaseSelect
    :model-value="type"
    :label="t('boats.tanks.fields.type')"
    name="type"
    :options="tankTypeOptions"
    required
    :error="errors.type"
    @update:model-value="emit('update:type', String($event ?? ''))"
  />
  <BaseInput
    :model-value="capacityL"
    :label="t('boats.tanks.fields.capacityL')"
    name="capacityL"
    type="number"
    :placeholder="t('common.optional')"
    :error="errors.capacityL"
    @update:model-value="emit('update:capacityL', $event)"
  />
  <BaseInput
    :model-value="lowLevelPct"
    :label="t('boats.tanks.fields.lowLevelPct')"
    name="lowLevelPct"
    type="number"
    min="1"
    max="99"
    :placeholder="t('common.optional')"
    :hint="t('boats.tanks.fields.lowLevelHint')"
    :error="errors.lowLevelPct"
    @update:model-value="emit('update:lowLevelPct', $event)"
  />
  <BaseInput
    :model-value="instrumentKey"
    :label="t('boats.tanks.fields.instrumentKey')"
    name="instrumentKey"
    :placeholder="t('common.optional')"
    :hint="t('boats.tanks.fields.instrumentKeyHint')"
    :error="errors.instrumentKey"
    @update:model-value="emit('update:instrumentKey', $event)"
  />
</template>
