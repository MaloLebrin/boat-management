<script setup lang="ts">
import { SAIL_TYPE_OPTIONS } from '~/constants/boat_form_options'
import { inputClass, selectClass } from '~/utils/form_styles'

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

function err(key: string): string | undefined {
  const v = props.errors[key]
  return Array.isArray(v) ? v[0] : v
}

function dateValue(): string {
  const raw = props.sail?.manufacturedAt
  if (!raw) return ''
  return raw.slice(0, 10)
}
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <div>
      <label class="mb-1 block text-sm font-medium text-zinc-800">Type</label>
      <select
        id="sailType"
        name="sailType"
        :class="selectClass"
        :data-invalid="err('sailType') ? 'true' : undefined"
      >
        <option
          v-for="o in SAIL_TYPE_OPTIONS"
          :key="o.value"
          :value="o.value"
          :selected="(sail?.sailType ?? 'main') === o.value"
        >
          {{ o.label }}
        </option>
      </select>
      <p v-if="err('sailType')" class="mt-2 text-sm font-medium text-red-600">{{ err('sailType') }}</p>
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
      <label class="mb-1 block text-sm font-medium text-zinc-800">Area (m²)</label>
      <input
        type="number"
        step="0.1"
        name="areaM2"
        :value="sail?.areaM2 === null || sail?.areaM2 === undefined ? '' : String(sail.areaM2)"
        :class="inputClass"
        :data-invalid="err('areaM2') ? 'true' : undefined"
      />
      <p v-if="err('areaM2')" class="mt-2 text-sm font-medium text-red-600">{{ err('areaM2') }}</p>
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-zinc-800">Material</label>
      <input
        type="text"
        name="material"
        :value="sail?.material ?? ''"
        :class="inputClass"
        :data-invalid="err('material') ? 'true' : undefined"
      />
      <p v-if="err('material')" class="mt-2 text-sm font-medium text-red-600">{{ err('material') }}</p>
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-zinc-800">Reef points</label>
      <input
        type="number"
        name="reefPoints"
        :value="sail?.reefPoints === null || sail?.reefPoints === undefined ? '' : String(sail.reefPoints)"
        :class="inputClass"
        :data-invalid="err('reefPoints') ? 'true' : undefined"
      />
      <p v-if="err('reefPoints')" class="mt-2 text-sm font-medium text-red-600">{{ err('reefPoints') }}</p>
    </div>
  </div>
</template>
