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
    <label class="flex items-start gap-3">
      <span class="relative mt-0.5 inline-flex">
        <input
          :id="id"
          :name="name"
          :disabled="disabled"
          type="checkbox"
          :checked="modelValue"
          class="peer h-4 w-4 appearance-none rounded-[0.35rem] border border-border bg-surface-elevated shadow-(--shadow-xs) transition-[box-shadow,transform] duration-(--motion-fast) ease-premium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:opacity-60"
          @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
        />
        <svg
          class="pointer-events-none absolute left-1/2 top-1/2 hidden h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-brand peer-checked:block"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M16.704 5.29a1 1 0 0 1 .006 1.415l-7.25 7.29a1 1 0 0 1-1.42-.002L3.29 9.245a1 1 0 1 1 1.42-1.402l3.04 3.082 6.54-6.57a1 1 0 0 1 1.414-.065Z"
            clip-rule="evenodd"
          />
        </svg>
      </span>
      <span class="text-sm text-fg-muted">
        <slot />
      </span>
    </label>
  </BaseField>
</template>
