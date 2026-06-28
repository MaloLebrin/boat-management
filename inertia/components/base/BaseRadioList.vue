<script setup lang="ts">
type RadioListValue = string | number | null

defineProps<{
  name: string
  modelValue: RadioListValue
  options: Array<{ value: RadioListValue; label: string; badge?: string }>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: RadioListValue]
}>()

function select(value: RadioListValue) {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="divide-y divide-border rounded-lg border border-border overflow-y-auto">
    <label
      v-for="opt in options"
      :key="String(opt.value)"
      class="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-surface-hover"
      :class="{ 'bg-brand/5': modelValue === opt.value }"
    >
      <input
        type="radio"
        :name="name"
        :checked="modelValue === opt.value"
        class="h-4 w-4 accent-brand"
        @change="select(opt.value)"
      />
      <span class="flex-1 text-sm" :class="opt.value === null ? 'text-fg-muted italic' : 'text-fg'">
        {{ opt.label }}
      </span>
      <span v-if="opt.badge" class="ml-auto text-xs text-brand font-medium">
        {{ opt.badge }}
      </span>
    </label>
  </div>
</template>
