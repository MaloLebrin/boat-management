<script setup lang="ts">
import { SAIL_TYPE_OPTIONS } from '~/constants/boat_form_options'
import type { BoatEditPayload, SailFormRow } from '~/types/boat_form'
import { nestedControlClass } from '~/utils/form_styles'

const sails = defineModel<SailFormRow[]>('sails', { required: true })

const props = defineProps<{
  boat?: BoatEditPayload
}>()

defineEmits<{
  add: []
  remove: [index: number]
}>()

function manufacturedAtForIndex(index: number): string {
  return props.boat?.sails[index]?.manufacturedAt ?? ''
}
</script>

<template>
  <div class="rounded-lg border border-zinc-200 bg-white p-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold text-zinc-900">Sails</h2>
      <button type="button" class="text-sm font-medium text-zinc-700 hover:underline" @click="$emit('add')">
        Add sail
      </button>
    </div>

    <div class="mt-4 space-y-6">
      <div v-if="sails.length === 0" class="text-sm text-zinc-600">No sails.</div>
      <div v-for="(sail, index) in sails" :key="index" class="rounded-md border border-zinc-200 p-4">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-zinc-900">Sail {{ index + 1 }}</p>
          <button
            type="button"
            class="text-sm font-medium text-red-700 hover:underline"
            @click="$emit('remove', index)"
          >
            Remove
          </button>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-zinc-800">Type</label>
            <select v-model="sail.sailType" :name="`sails[${index}][sailType]`" :class="nestedControlClass">
              <option v-for="o in SAIL_TYPE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-zinc-800">Manufacturing date</label>
            <input
              type="date"
              :name="`sails[${index}][manufacturedAt]`"
              :value="manufacturedAtForIndex(index)"
              :class="nestedControlClass"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-zinc-800">Area (m²)</label>
            <input
              v-model="sail.areaM2"
              type="number"
              step="0.1"
              :name="`sails[${index}][areaM2]`"
              :class="nestedControlClass"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-zinc-800">Material</label>
            <input v-model="sail.material" :name="`sails[${index}][material]`" :class="nestedControlClass" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-zinc-800">Reef points</label>
            <input
              v-model="sail.reefPoints"
              type="number"
              :name="`sails[${index}][reefPoints]`"
              :class="nestedControlClass"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
