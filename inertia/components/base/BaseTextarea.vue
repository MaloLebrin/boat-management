<script setup lang="ts">
import BaseField from '~/components/base/BaseField.vue'
import { computed } from 'vue'
import { getFieldError, nameToErrorKey, type FormErrors } from '~/utils/form_errors'

const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    errors?: FormErrors
    errorKey?: string
    id?: string
    name?: string
    rows?: number
    placeholder?: string
    modelValue?: string
    disabled?: boolean
  }>(),
  {
    rows: 4,
    modelValue: '',
    disabled: false,
  }
)

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const resolvedError = computed(() => {
  if (props.error) return props.error
  const key = props.errorKey ?? nameToErrorKey(props.name ?? '')
  return getFieldError(props.errors, key)
})
</script>

<template>
  <BaseField :label="label" :hint="hint" :error="resolvedError" :html-for="id">
    <textarea
      :id="id"
      :name="name"
      :rows="rows"
      :placeholder="placeholder"
      :disabled="disabled"
      :value="modelValue"
      :data-invalid="resolvedError ? 'true' : undefined"
      :aria-invalid="resolvedError ? 'true' : undefined"
      class="w-full rounded-(--radius-control) border border-border bg-surface-elevated px-3 py-2 text-sm text-fg shadow-sm placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 data-[invalid=true]:border-danger transition-shadow duration-(--motion-fast) ease-premium"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
  </BaseField>
</template>
