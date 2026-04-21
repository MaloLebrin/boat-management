<script setup lang="ts">
import { ENGINE_FUEL_OPTIONS, ENGINE_KIND_OPTIONS } from '~/constants/boat_form_options'
import { ref, watch } from 'vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'

export type BoatEquipmentEngineFieldsModel = {
  id?: number
  kind: string
  fuel: string | null
  brand: string | null
  model: string | null
  serialNumber: string | null
  manufacturedAt: string | null
  powerHp: number | null
  hours: number | null
}

const props = defineProps<{
  errors: Record<string, string | string[] | undefined>
  engine?: BoatEquipmentEngineFieldsModel | null
}>()

const kind = ref('')
const fuel = ref('')
const brand = ref('')
const model = ref('')
const serialNumber = ref('')
const manufacturedAt = ref('')
const powerHp = ref('')
const hours = ref('')

function syncFromProps() {
  const e = props.engine
  kind.value = e?.kind ?? ENGINE_KIND_OPTIONS[0]?.value ?? ''
  fuel.value = e?.fuel ?? ''
  brand.value = e?.brand ?? ''
  model.value = e?.model ?? ''
  serialNumber.value = e?.serialNumber ?? ''
  manufacturedAt.value = e?.manufacturedAt ? e.manufacturedAt.slice(0, 10) : ''
  powerHp.value = e?.powerHp === null || e?.powerHp === undefined ? '' : String(e.powerHp)
  hours.value = e?.hours === null || e?.hours === undefined ? '' : String(e.hours)
}

watch(
  () => props.engine,
  () => syncFromProps(),
  { immediate: true }
)
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <BaseSelect
      id="kind"
      name="kind"
      label="Kind"
      :options="ENGINE_KIND_OPTIONS"
      v-model="kind"
      :errors="errors"
    />

    <BaseSelect
      id="fuel"
      name="fuel"
      label="Fuel"
      placeholder="—"
      :allow-empty="true"
      :options="ENGINE_FUEL_OPTIONS"
      v-model="fuel"
      :errors="errors"
    />

    <BaseInput id="brand" name="brand" label="Brand" v-model="brand" :errors="errors" />
    <BaseInput id="model" name="model" label="Model" v-model="model" :errors="errors" />
    <BaseInput
      id="serialNumber"
      name="serialNumber"
      label="Serial number"
      v-model="serialNumber"
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
      id="powerHp"
      name="powerHp"
      label="Power (hp)"
      type="number"
      step="0.1"
      inputmode="decimal"
      v-model="powerHp"
      :errors="errors"
    />
    <BaseInput
      id="hours"
      name="hours"
      label="Hours"
      type="number"
      inputmode="numeric"
      v-model="hours"
      :errors="errors"
    />
  </div>
</template>
