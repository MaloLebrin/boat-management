<script setup lang="ts">
import { RIG_TYPE_OPTIONS } from '~/constants/boat_form_options'
import { inputClass, selectClass } from '~/utils/form_styles'

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

function err(key: string): string | undefined {
  const v = props.errors[key]
  return Array.isArray(v) ? v[0] : v
}

function dateValue(): string {
  const raw = props.rig?.manufacturedAt
  if (!raw) return ''
  return raw.slice(0, 10)
}
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <div>
      <label class="mb-1 block text-sm font-medium text-zinc-800">Rig type</label>
      <select
        id="rigType"
        name="rigType"
        :class="selectClass"
        :data-invalid="err('rigType') ? 'true' : undefined"
      >
        <option
          v-for="o in RIG_TYPE_OPTIONS"
          :key="o.value"
          :value="o.value"
          :selected="(rig?.rigType ?? 'sloop') === o.value"
        >
          {{ o.label }}
        </option>
      </select>
      <p v-if="err('rigType')" class="mt-2 text-sm font-medium text-red-600">{{ err('rigType') }}</p>
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
      <label class="mb-1 block text-sm font-medium text-zinc-800">Mast count</label>
      <input
        type="number"
        name="mastCount"
        :value="rig?.mastCount === null || rig?.mastCount === undefined ? '' : String(rig.mastCount)"
        :class="inputClass"
        :data-invalid="err('mastCount') ? 'true' : undefined"
      />
      <p v-if="err('mastCount')" class="mt-2 text-sm font-medium text-red-600">{{ err('mastCount') }}</p>
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-zinc-800">Spreaders</label>
      <input
        type="number"
        name="spreaders"
        :value="rig?.spreaders === null || rig?.spreaders === undefined ? '' : String(rig.spreaders)"
        :class="inputClass"
        :data-invalid="err('spreaders') ? 'true' : undefined"
      />
      <p v-if="err('spreaders')" class="mt-2 text-sm font-medium text-red-600">{{ err('spreaders') }}</p>
    </div>
  </div>
</template>
