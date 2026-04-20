<script setup lang="ts">
import { computed } from 'vue'
import { RIG_TYPE_OPTIONS } from '~/constants/boat_form_options'
import type { BoatEditPayload, RigFormRow } from '~/types/boat_form'
import { nestedControlClass } from '~/utils/form_styles'

const rig = defineModel<RigFormRow>('rig', { required: true })

const props = defineProps<{
  boat?: BoatEditPayload
}>()

const rigManufacturedAt = computed(() => props.boat?.rig?.manufacturedAt ?? '')
</script>

<template>
  <div class="rounded-lg border border-zinc-200 bg-white p-4">
    <h2 class="text-sm font-semibold text-zinc-900">Rig</h2>
    <div class="mt-4 grid grid-cols-2 gap-4">
      <div>
        <label class="mb-1 block text-sm font-medium text-zinc-800">Rig type</label>
        <select v-model="rig.rigType" name="rig[rigType]" :class="nestedControlClass">
          <option v-for="o in RIG_TYPE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-zinc-800">Manufacturing date</label>
        <input
          type="date"
          name="rig[manufacturedAt]"
          :value="rigManufacturedAt"
          :class="nestedControlClass"
        />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-zinc-800">Mast count</label>
        <input v-model="rig.mastCount" type="number" name="rig[mastCount]" :class="nestedControlClass" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-zinc-800">Spreaders</label>
        <input v-model="rig.spreaders" type="number" name="rig[spreaders]" :class="nestedControlClass" />
      </div>
    </div>
  </div>
</template>
