<script setup lang="ts">
import { ENGINE_FUEL_OPTIONS, ENGINE_KIND_OPTIONS } from '~/constants/boat_form_options'
import type { BoatEditPayload, EngineFormRow } from '~/types/boat_form'
import { nestedControlClass } from '~/utils/form_styles'

const engines = defineModel<EngineFormRow[]>('engines', { required: true })

const props = defineProps<{
  boat?: BoatEditPayload
}>()

defineEmits<{
  add: []
  remove: [index: number]
}>()

function manufacturedAtForIndex(index: number): string {
  return props.boat?.engines[index]?.manufacturedAt ?? ''
}
</script>

<template>
  <div class="rounded-lg border border-zinc-200 bg-white p-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold text-zinc-900">Engines</h2>
      <button type="button" class="text-sm font-medium text-zinc-700 hover:underline" @click="$emit('add')">
        Add engine
      </button>
    </div>

    <div class="mt-4 space-y-6">
      <div v-for="(engine, index) in engines" :key="index" class="rounded-md border border-zinc-200 p-4">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-zinc-900">Engine {{ index + 1 }}</p>
          <button
            v-if="engines.length > 1"
            type="button"
            class="text-sm font-medium text-red-700 hover:underline"
            @click="$emit('remove', index)"
          >
            Remove
          </button>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-zinc-800">Kind</label>
            <select v-model="engine.kind" :name="`engines[${index}][kind]`" :class="nestedControlClass">
              <option v-for="o in ENGINE_KIND_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-zinc-800">Fuel</label>
            <select v-model="engine.fuel" :name="`engines[${index}][fuel]`" :class="nestedControlClass">
              <option value="">—</option>
              <option v-for="o in ENGINE_FUEL_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-zinc-800">Brand</label>
            <input v-model="engine.brand" :name="`engines[${index}][brand]`" :class="nestedControlClass" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-zinc-800">Model</label>
            <input v-model="engine.model" :name="`engines[${index}][model]`" :class="nestedControlClass" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-zinc-800">Serial number</label>
            <input
              v-model="engine.serialNumber"
              :name="`engines[${index}][serialNumber]`"
              :class="nestedControlClass"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-zinc-800">Manufacturing date</label>
            <input
              type="date"
              :name="`engines[${index}][manufacturedAt]`"
              :value="manufacturedAtForIndex(index)"
              :class="nestedControlClass"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-zinc-800">Power (hp)</label>
            <input
              v-model="engine.powerHp"
              type="number"
              step="0.1"
              :name="`engines[${index}][powerHp]`"
              :class="nestedControlClass"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-zinc-800">Hours</label>
            <input
              v-model="engine.hours"
              type="number"
              :name="`engines[${index}][hours]`"
              :class="nestedControlClass"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
