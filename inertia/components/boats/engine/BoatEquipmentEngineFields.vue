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

function err(key: string): string | undefined {
  const v = props.errors[key]
  return Array.isArray(v) ? v[0] : v
}

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
      :error="err('kind')"
    />

    <BaseSelect
      id="fuel"
      name="fuel"
      label="Fuel"
      placeholder="—"
      :allow-empty="true"
      :options="ENGINE_FUEL_OPTIONS"
      v-model="fuel"
      :error="err('fuel')"
    />

    <BaseInput id="brand" name="brand" label="Brand" v-model="brand" :error="err('brand')" />
    <BaseInput id="model" name="model" label="Model" v-model="model" :error="err('model')" />
    <BaseInput
      id="serialNumber"
      name="serialNumber"
      label="Serial number"
      v-model="serialNumber"
      :error="err('serialNumber')"
    />
    <BaseInput
      id="manufacturedAt"
      name="manufacturedAt"
      label="Manufacturing date"
      type="date"
      v-model="manufacturedAt"
      :error="err('manufacturedAt')"
    />
    <BaseInput
      id="powerHp"
      name="powerHp"
      label="Power (hp)"
      type="number"
      step="0.1"
      inputmode="decimal"
      v-model="powerHp"
      :error="err('powerHp')"
    />
    <BaseInput
      id="hours"
      name="hours"
      label="Hours"
      type="number"
      inputmode="numeric"
      v-model="hours"
      :error="err('hours')"
    />
  </div>
</template>
