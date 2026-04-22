<script setup lang="ts">
import { RIG_TYPE_OPTIONS } from '#shared/constants/boats/boat_form_options'
import { ref, watch } from 'vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'

export type BoatEquipmentRigFieldsModel = {
  rigType: string
  manufacturedAt: string | null
  mastCount: number | null
  spreaders: number | null
}

const props = defineProps<{
  errors: Record<string, string | string[] | undefined>
  rig?: BoatEquipmentRigFieldsModel | null
}>()

const rigType = ref('')
const manufacturedAt = ref('')
const mastCount = ref('')
const spreaders = ref('')

function syncFromProps() {
  const r = props.rig
  rigType.value = r?.rigType ?? RIG_TYPE_OPTIONS[0]?.value ?? 'sloop'
  manufacturedAt.value = r?.manufacturedAt ? r.manufacturedAt.slice(0, 10) : ''
  mastCount.value = r?.mastCount === null || r?.mastCount === undefined ? '' : String(r.mastCount)
  spreaders.value = r?.spreaders === null || r?.spreaders === undefined ? '' : String(r.spreaders)
}

watch(
  () => props.rig,
  () => syncFromProps(),
  { immediate: true }
)
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <BaseSelect
      id="rigType"
      name="rigType"
      label="Rig type"
      :options="RIG_TYPE_OPTIONS"
      v-model="rigType"
      :errors="errors"
    />

    <BaseInput
      id="manufacturedAt"
      name="manufacturedAt"
      label="Manufacturing date"
      type="date"
      v-model="manufacturedAt"
      :errors="errors"
    />

    <BaseInput
      id="mastCount"
      name="mastCount"
      label="Mast count"
      type="number"
      inputmode="numeric"
      v-model="mastCount"
      :errors="errors"
    />

    <BaseInput
      id="spreaders"
      name="spreaders"
      label="Spreaders"
      type="number"
      inputmode="numeric"
      v-model="spreaders"
      :errors="errors"
    />
  </div>
</template>
