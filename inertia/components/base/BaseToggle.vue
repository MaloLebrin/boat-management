<script setup lang="ts">
import BaseField from '~/components/base/BaseField.vue'

withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    id?: string
    name?: string
    modelValue?: boolean
    disabled?: boolean
  }>(),
  { modelValue: false, disabled: false }
)

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()
</script>

<template>
  <BaseField :label="label" :hint="hint" :error="error" :html-for="id">
    <label
      class="flex items-center justify-between gap-4 rounded-(--radius-control) border border-border bg-surface-elevated px-3 py-2 shadow-(--shadow-xs)"
    >
      <span class="text-sm text-fg-muted">
        <slot />
      </span>
      <button
        type="button"
        role="switch"
        :aria-checked="modelValue ? 'true' : 'false'"
        :disabled="disabled"
        class="group inline-flex h-6 w-11 items-center rounded-full border border-border bg-surface-muted p-0.5 transition-[background-color,box-shadow,transform] duration-(--motion-fast) ease-premium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:opacity-60"
        :class="modelValue ? 'bg-mint-200 border-mint-300' : ''"
        @click="$emit('update:modelValue', !modelValue)"
      >
        <span
          class="h-5 w-5 rounded-full bg-surface-elevated shadow-(--shadow-xs) transition-[transform] duration-(--motion-fast) ease-premium"
          :class="modelValue ? 'translate-x-5' : 'translate-x-0'"
        />
      </button>
      <input :id="id" :name="name" type="hidden" :value="modelValue ? 'true' : 'false'" />
    </label>
  </BaseField>
</template>
