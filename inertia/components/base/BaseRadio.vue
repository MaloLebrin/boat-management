<script setup lang="ts">
import BaseField from '~/components/base/BaseField.vue'

type RadioValue = string | number

withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    name: string
    options: Array<{ label: string; value: RadioValue }>
    modelValue?: RadioValue | null
    disabled?: boolean
  }>(),
  { modelValue: null, disabled: false }
)

defineEmits<{
  (e: 'update:modelValue', value: RadioValue): void
}>()
</script>

<template>
  <BaseField :label="label" :hint="hint" :error="error">
    <div class="grid gap-2">
      <label
        v-for="opt in options"
        :key="String(opt.value)"
        class="flex items-center gap-3 rounded-(--radius-control) border border-border bg-surface-elevated px-3 py-2 text-sm text-fg-muted shadow-(--shadow-xs) transition-[transform,box-shadow] duration-(--motion-fast) ease-premium hover:shadow-(--shadow-sm)"
      >
        <span class="relative inline-flex">
          <input
            type="radio"
            :name="name"
            :value="opt.value"
            :checked="modelValue === opt.value"
            :disabled="disabled"
            class="peer h-4 w-4 appearance-none rounded-full border border-border bg-surface-elevated shadow-(--shadow-xs) focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:opacity-60"
            @change="$emit('update:modelValue', opt.value)"
          />
          <span
            class="pointer-events-none absolute left-1/2 top-1/2 hidden h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand peer-checked:block"
          />
        </span>
        <span class="text-fg">{{ opt.label }}</span>
      </label>
    </div>
  </BaseField>
</template>
