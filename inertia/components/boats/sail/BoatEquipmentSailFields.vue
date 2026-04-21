<script setup lang="ts">
import { SAIL_TYPE_OPTIONS } from '~/constants/boat_form_options'
import { ref, watch } from 'vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'

export type BoatEquipmentSailFieldsModel = {
  id?: number
  sailType: string
  manufacturedAt: string | null
  areaM2: number | null
  material: string | null
  reefPoints: number | null
}

const props = defineProps<{
  errors: Record<string, string | string[] | undefined>
  sail?: BoatEquipmentSailFieldsModel | null
}>()

const sailType = ref('')
const manufacturedAt = ref('')
const areaM2 = ref('')
const material = ref('')
const reefPoints = ref('')

function syncFromProps() {
  const s = props.sail
  sailType.value = s?.sailType ?? SAIL_TYPE_OPTIONS[0]?.value ?? 'main'
  manufacturedAt.value = s?.manufacturedAt ? s.manufacturedAt.slice(0, 10) : ''
  areaM2.value = s?.areaM2 === null || s?.areaM2 === undefined ? '' : String(s.areaM2)
  material.value = s?.material ?? ''
  reefPoints.value = s?.reefPoints === null || s?.reefPoints === undefined ? '' : String(s.reefPoints)
}

watch(
  () => props.sail,
  () => syncFromProps(),
  { immediate: true }
)
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <BaseSelect
      id="sailType"
      name="sailType"
      label="Type"
      :options="SAIL_TYPE_OPTIONS"
      v-model="sailType"
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
      id="areaM2"
      name="areaM2"
      label="Area (m²)"
      type="number"
      step="0.1"
      inputmode="decimal"
      v-model="areaM2"
      :errors="errors"
    />

    <BaseInput
      id="material"
      name="material"
      label="Material"
      v-model="material"
      :errors="errors"
    />

    <BaseInput
      id="reefPoints"
      name="reefPoints"
      label="Reef points"
      type="number"
      inputmode="numeric"
      v-model="reefPoints"
      :errors="errors"
    />
  </div>
</template>
