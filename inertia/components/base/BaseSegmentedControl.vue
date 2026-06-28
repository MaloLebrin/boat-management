<script setup lang="ts">
defineProps<{
  modelValue: string | number
  options: Array<{ value: string | number; label: string }>
}>()

defineEmits<{
  (e: 'update:modelValue', value: string | number): void
}>()
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :class="[
        'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
        modelValue === option.value
          ? 'bg-brand text-white'
          : 'bg-surface-muted text-fg-muted hover:bg-surface-elevated hover:text-fg',
      ]"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
