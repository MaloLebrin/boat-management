<script setup lang="ts">
import { ENGINE_FUEL_OPTIONS, ENGINE_KIND_OPTIONS } from '~/constants/boat_form_options'
import { inputClass, selectClass } from '~/utils/form_styles'

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

function err(key: string): string | undefined {
  const v = props.errors[key]
  return Array.isArray(v) ? v[0] : v
}

function dateValue(): string {
  const raw = props.engine?.manufacturedAt
  if (!raw) return ''
  return raw.slice(0, 10)
}
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <div>
      <label class="mb-1 block text-sm font-medium text-zinc-800">Kind</label>
      <select
        id="kind"
        name="kind"
        :class="selectClass"
        :data-invalid="err('kind') ? 'true' : undefined"
      >
        <option v-for="o in ENGINE_KIND_OPTIONS" :key="o.value" :value="o.value" :selected="engine?.kind === o.value">
          {{ o.label }}
        </option>
      </select>
      <p v-if="err('kind')" class="mt-2 text-sm font-medium text-red-600">{{ err('kind') }}</p>
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-zinc-800">Fuel</label>
      <select
        id="fuel"
        name="fuel"
        :class="selectClass"
        :data-invalid="err('fuel') ? 'true' : undefined"
      >
        <option value="__none__" :selected="!engine?.fuel">—</option>
        <option v-for="o in ENGINE_FUEL_OPTIONS" :key="o.value" :value="o.value" :selected="engine?.fuel === o.value">
          {{ o.label }}
        </option>
      </select>
      <p v-if="err('fuel')" class="mt-2 text-sm font-medium text-red-600">{{ err('fuel') }}</p>
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-zinc-800">Brand</label>
      <input
        type="text"
        name="brand"
        :value="engine?.brand ?? ''"
        :class="inputClass"
        :data-invalid="err('brand') ? 'true' : undefined"
      />
      <p v-if="err('brand')" class="mt-2 text-sm font-medium text-red-600">{{ err('brand') }}</p>
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-zinc-800">Model</label>
      <input
        type="text"
        name="model"
        :value="engine?.model ?? ''"
        :class="inputClass"
        :data-invalid="err('model') ? 'true' : undefined"
      />
      <p v-if="err('model')" class="mt-2 text-sm font-medium text-red-600">{{ err('model') }}</p>
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-zinc-800">Serial number</label>
      <input
        type="text"
        name="serialNumber"
        :value="engine?.serialNumber ?? ''"
        :class="inputClass"
        :data-invalid="err('serialNumber') ? 'true' : undefined"
      />
      <p v-if="err('serialNumber')" class="mt-2 text-sm font-medium text-red-600">{{ err('serialNumber') }}</p>
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-zinc-800">Manufacturing date</label>
      <input
        type="date"
        name="manufacturedAt"
        :value="dateValue()"
        :class="inputClass"
        :data-invalid="err('manufacturedAt') ? 'true' : undefined"
      />
      <p v-if="err('manufacturedAt')" class="mt-2 text-sm font-medium text-red-600">{{ err('manufacturedAt') }}</p>
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-zinc-800">Power (hp)</label>
      <input
        type="number"
        step="0.1"
        name="powerHp"
        :value="engine?.powerHp === null || engine?.powerHp === undefined ? '' : String(engine.powerHp)"
        :class="inputClass"
        :data-invalid="err('powerHp') ? 'true' : undefined"
      />
      <p v-if="err('powerHp')" class="mt-2 text-sm font-medium text-red-600">{{ err('powerHp') }}</p>
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-zinc-800">Hours</label>
      <input
        type="number"
        name="hours"
        :value="engine?.hours === null || engine?.hours === undefined ? '' : String(engine.hours)"
        :class="inputClass"
        :data-invalid="err('hours') ? 'true' : undefined"
      />
      <p v-if="err('hours')" class="mt-2 text-sm font-medium text-red-600">{{ err('hours') }}</p>
    </div>
  </div>
</template>
