<script setup lang="ts">
import BaseField from '~/components/base/BaseField.vue'
import { selectClass } from '~/utils/form_styles'
import { computed } from 'vue'
import { getFieldError, nameToErrorKey, type FormErrors } from '~/utils/form_errors'

type OptionValue = string | number

const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    errors?: FormErrors
    errorKey?: string
    id?: string
    name?: string
    modelValue?: OptionValue | ''
    disabled?: boolean
    required?: boolean
    placeholder?: string
    allowEmpty?: boolean
    options: ReadonlyArray<{ label: string; value: OptionValue }>
  }>(),
  {
    modelValue: '',
    disabled: false,
    placeholder: 'Select…',
    allowEmpty: false,
  }
)

defineEmits<{
  (e: 'update:modelValue', value: OptionValue | ''): void
}>()

const resolvedError = computed(() => {
  if (props.error) return props.error
  const key = props.errorKey ?? nameToErrorKey(props.name ?? '')
  return getFieldError(props.errors, key)
})
</script>

<template>
  <BaseField :label="label" :hint="hint" :error="resolvedError" :html-for="id">
    <div class="relative">
      <select
        :id="id"
        :name="name"
        :disabled="disabled"
        :required="required"
        :value="modelValue"
        :data-invalid="resolvedError ? 'true' : undefined"
        :aria-invalid="resolvedError ? 'true' : undefined"
        :class="[
          selectClass,
          'appearance-none pr-10 transition-shadow duration-(--motion-fast) ease-premium',
        ]"
        @change="
          $emit(
            'update:modelValue',
            ($event.target as HTMLSelectElement).value === ''
              ? ''
              : ($event.target as HTMLSelectElement).value
          )
        "
      >
        <option value="" :disabled="!allowEmpty">
          {{ placeholder }}
        </option>
        <option v-for="opt in options" :key="String(opt.value)" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <svg
        class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.936a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
          clip-rule="evenodd"
        />
      </svg>
    </div>
  </BaseField>
</template>
