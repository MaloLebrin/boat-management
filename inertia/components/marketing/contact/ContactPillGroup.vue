<script setup lang="ts">
interface PillOption {
  value: string
  label: string
}

withDefaults(
  defineProps<{
    modelValue: string
    options: PillOption[]
    layout?: 'wrap' | 'row'
  }>(),
  { layout: 'wrap' }
)

defineEmits<{ (e: 'update:modelValue', value: string): void }>()
</script>

<template>
  <div :class="layout === 'row' ? 'flex gap-2' : 'flex flex-wrap gap-2'">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="modelValue === option.value"
      :class="[
        'border font-medium transition-colors',
        layout === 'row' ? 'flex-1 rounded-xl py-3 text-sm' : 'rounded-lg px-3 py-1.5 text-sm',
        modelValue === option.value
          ? 'border-navy-900 bg-cream font-semibold text-fg'
          : 'border-bone bg-surface-elevated text-fg-muted hover:bg-cream/50',
      ]"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
