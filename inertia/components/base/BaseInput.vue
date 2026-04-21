<script setup lang="ts">
import BaseField from '~/components/base/BaseField.vue'
import { inputClass } from '~/utils/form_styles'
import { computed, useSlots } from 'vue'
import { getFieldError, nameToErrorKey, type FormErrors } from '~/utils/form_errors'

type InputMode = 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search'

const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    errors?: FormErrors
    errorKey?: string
    id?: string
    name?: string
    type?: string
    autocomplete?: string
    placeholder?: string
    modelValue?: string
    disabled?: boolean
    step?: string | number
    min?: string | number
    max?: string | number
    inputmode?: InputMode
    pattern?: string
    required?: boolean
    readonly?: boolean
  }>(),
  {
    type: 'text',
    modelValue: '',
    disabled: false,
    required: false,
    readonly: false,
  }
)

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const slots = useSlots()
const hasTrailing = computed(() => Boolean(slots.trailing))
const inputPaddingClass = computed(() => (hasTrailing.value ? 'pr-24' : ''))

const resolvedError = computed(() => {
  if (props.error) return props.error
  const key = props.errorKey ?? nameToErrorKey(props.name ?? '')
  return getFieldError(props.errors, key)
})
</script>

<template>
  <BaseField :label="label" :hint="hint" :error="resolvedError" :html-for="id">
    <div class="relative">
      <input
        :id="id"
        :name="name"
        :type="props.type"
        :step="step"
        :min="min"
        :max="max"
        :inputmode="inputmode"
        :pattern="pattern"
        :required="required"
        :readonly="readonly"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :disabled="disabled"
        :value="modelValue"
        :data-invalid="resolvedError ? 'true' : undefined"
        :aria-invalid="resolvedError ? 'true' : undefined"
        :class="[
          inputClass,
          inputPaddingClass,
          'transition-[box-shadow,transform] duration-(--motion-fast) ease-premium focus:shadow-(--shadow-xs)',
        ]"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <div v-if="hasTrailing" class="absolute inset-y-0 right-0 flex items-center pr-3">
        <slot name="trailing" />
      </div>
    </div>
  </BaseField>
</template>
