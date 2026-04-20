<script setup lang="ts">
import { HULL_MATERIAL_OPTIONS, PROPULSION_OPTIONS } from '~/constants/boat_form_options'
import type { BoatEditPayload, PropulsionTypeUi } from '~/types/boat_form'
import { inputClass, selectClass } from '~/utils/form_styles'

const propulsionType = defineModel<PropulsionTypeUi>('propulsionType', { required: true })

const props = defineProps<{
  mode: 'create' | 'edit'
  boat?: BoatEditPayload
  showMastHeight: boolean
  errors: Record<string, string | string[] | undefined>
}>()

function err(key: string): string | undefined {
  const v = props.errors[key]
  return Array.isArray(v) ? v[0] : v
}

function bindEditValue(get: () => string | number | null | undefined) {
  if (props.mode !== 'edit' || !props.boat) return {}
  const v = get()
  return { value: v === null || v === undefined ? '' : String(v) }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <label for="name" class="mb-1 block text-sm font-medium text-zinc-800">Name</label>
      <input
        type="text"
        name="name"
        id="name"
        v-bind="bindEditValue(() => boat?.name)"
        :data-invalid="err('name') ? 'true' : undefined"
        :class="inputClass"
      />
      <p v-if="err('name')" class="mt-2 text-sm font-medium text-red-600">{{ err('name') }}</p>
    </div>

    <div>
      <label for="registrationNumber" class="mb-1 block text-sm font-medium text-zinc-800">
        Registration number
      </label>
      <input
        type="text"
        name="registrationNumber"
        id="registrationNumber"
        v-bind="bindEditValue(() => boat?.registrationNumber)"
        :data-invalid="err('registrationNumber') ? 'true' : undefined"
        :class="inputClass"
      />
      <p v-if="err('registrationNumber')" class="mt-2 text-sm font-medium text-red-600">
        {{ err('registrationNumber') }}
      </p>
    </div>

    <div>
      <label for="type" class="mb-1 block text-sm font-medium text-zinc-800">Type</label>
      <input
        type="text"
        name="type"
        id="type"
        v-bind="bindEditValue(() => boat?.type)"
        :data-invalid="err('type') ? 'true' : undefined"
        :class="inputClass"
      />
      <p v-if="err('type')" class="mt-2 text-sm font-medium text-red-600">{{ err('type') }}</p>
    </div>

    <div>
      <label for="propulsionType" class="mb-1 block text-sm font-medium text-zinc-800">
        Propulsion type
      </label>
      <select
        id="propulsionType"
        name="propulsionType"
        v-model="propulsionType"
        :data-invalid="err('propulsionType') ? 'true' : undefined"
        :class="selectClass"
      >
        <option value="">—</option>
        <option v-for="o in PROPULSION_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <p v-if="err('propulsionType')" class="mt-2 text-sm font-medium text-red-600">
        {{ err('propulsionType') }}
      </p>
    </div>

    <div>
      <label for="manufacturedAt" class="mb-1 block text-sm font-medium text-zinc-800">
        Manufacturing date
      </label>
      <input
        type="date"
        name="manufacturedAt"
        id="manufacturedAt"
        v-bind="bindEditValue(() => boat?.manufacturedAt)"
        :data-invalid="err('manufacturedAt') ? 'true' : undefined"
        :class="inputClass"
      />
      <p v-if="err('manufacturedAt')" class="mt-2 text-sm font-medium text-red-600">
        {{ err('manufacturedAt') }}
      </p>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="lengthM" class="mb-1 block text-sm font-medium text-zinc-800">Length (m)</label>
        <input
          type="number"
          step="0.01"
          name="lengthM"
          id="lengthM"
          v-bind="bindEditValue(() => boat?.lengthM)"
          :data-invalid="err('lengthM') ? 'true' : undefined"
          :class="inputClass"
        />
        <p v-if="err('lengthM')" class="mt-2 text-sm font-medium text-red-600">{{ err('lengthM') }}</p>
      </div>
      <div>
        <label for="beamM" class="mb-1 block text-sm font-medium text-zinc-800">Beam (m)</label>
        <input
          type="number"
          step="0.01"
          name="beamM"
          id="beamM"
          v-bind="bindEditValue(() => boat?.beamM)"
          :data-invalid="err('beamM') ? 'true' : undefined"
          :class="inputClass"
        />
        <p v-if="err('beamM')" class="mt-2 text-sm font-medium text-red-600">{{ err('beamM') }}</p>
      </div>
      <div>
        <label for="draftM" class="mb-1 block text-sm font-medium text-zinc-800">Draft (m)</label>
        <input
          type="number"
          step="0.01"
          name="draftM"
          id="draftM"
          v-bind="bindEditValue(() => boat?.draftM)"
          :data-invalid="err('draftM') ? 'true' : undefined"
          :class="inputClass"
        />
        <p v-if="err('draftM')" class="mt-2 text-sm font-medium text-red-600">{{ err('draftM') }}</p>
      </div>
      <div v-if="showMastHeight">
        <label for="mastHeightM" class="mb-1 block text-sm font-medium text-zinc-800">Mast height (m)</label>
        <input
          type="number"
          step="0.01"
          name="mastHeightM"
          id="mastHeightM"
          v-bind="bindEditValue(() => boat?.mastHeightM)"
          :data-invalid="err('mastHeightM') ? 'true' : undefined"
          :class="inputClass"
        />
        <p v-if="err('mastHeightM')" class="mt-2 text-sm font-medium text-red-600">
          {{ err('mastHeightM') }}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="hullMaterial" class="mb-1 block text-sm font-medium text-zinc-800">Hull material</label>
        <select
          id="hullMaterial"
          name="hullMaterial"
          v-bind="bindEditValue(() => boat?.hullMaterial)"
          :data-invalid="err('hullMaterial') ? 'true' : undefined"
          :class="selectClass"
        >
          <option value="">—</option>
          <option v-for="o in HULL_MATERIAL_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <p v-if="err('hullMaterial')" class="mt-2 text-sm font-medium text-red-600">
          {{ err('hullMaterial') }}
        </p>
      </div>
      <div>
        <label for="yearBuilt" class="mb-1 block text-sm font-medium text-zinc-800">Year built</label>
        <input
          type="number"
          name="yearBuilt"
          id="yearBuilt"
          v-bind="bindEditValue(() => boat?.yearBuilt)"
          :data-invalid="err('yearBuilt') ? 'true' : undefined"
          :class="inputClass"
        />
        <p v-if="err('yearBuilt')" class="mt-2 text-sm font-medium text-red-600">{{ err('yearBuilt') }}</p>
      </div>
      <div>
        <label for="manufacturer" class="mb-1 block text-sm font-medium text-zinc-800">Manufacturer</label>
        <input
          type="text"
          name="manufacturer"
          id="manufacturer"
          v-bind="bindEditValue(() => boat?.manufacturer)"
          :data-invalid="err('manufacturer') ? 'true' : undefined"
          :class="inputClass"
        />
        <p v-if="err('manufacturer')" class="mt-2 text-sm font-medium text-red-600">
          {{ err('manufacturer') }}
        </p>
      </div>
      <div>
        <label for="model" class="mb-1 block text-sm font-medium text-zinc-800">Model</label>
        <input
          type="text"
          name="model"
          id="model"
          v-bind="bindEditValue(() => boat?.model)"
          :data-invalid="err('model') ? 'true' : undefined"
          :class="inputClass"
        />
        <p v-if="err('model')" class="mt-2 text-sm font-medium text-red-600">{{ err('model') }}</p>
      </div>
    </div>
  </div>
</template>
