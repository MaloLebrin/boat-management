<script setup lang="ts">
import SimulatorStepWear from '~/components/marketing/simulator/SimulatorStepWear.vue'
import type { SimulatorBoatInput } from '../../../../shared/types/simulator'

defineProps<{ modelValue: Partial<SimulatorBoatInput> }>()
defineEmits<{ 'update:modelValue': [value: Partial<SimulatorBoatInput>]; 'next': []; 'back': [] }>()
</script>

<template>
  <SimulatorStepWear
    :model-value="modelValue"
    wear-field="hullWear"
    label-key="simulator.hull_wear_label"
    @update:model-value="$emit('update:modelValue', $event)"
    @next="$emit('next')"
    @back="$emit('back')"
  />
</template>
