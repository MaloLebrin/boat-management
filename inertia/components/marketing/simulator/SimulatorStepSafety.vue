<script setup lang="ts">
import SimulatorStepWear from '~/components/marketing/simulator/SimulatorStepWear.vue'
import type { SimulatorBoatInput } from '../../../../shared/types/simulator'

defineProps<{ modelValue: Partial<SimulatorBoatInput> }>()
defineEmits<{ 'update:modelValue': [value: Partial<SimulatorBoatInput>]; 'next': []; 'back': [] }>()
</script>

<template>
  <SimulatorStepWear
    :model-value="modelValue"
    wear-field="safetyWear"
    label-key="simulator.safety_wear_label"
    mention="simulator.safety_mention"
    @update:model-value="$emit('update:modelValue', $event)"
    @next="$emit('next')"
    @back="$emit('back')"
  />
</template>
