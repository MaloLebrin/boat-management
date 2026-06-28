<script setup lang="ts">
import { computed, useAttrs, useSlots } from 'vue'
import BaseField from '~/components/base/BaseField.vue'
import { getFieldError, nameToErrorKey, type FormErrors } from '~/utils/form_errors'
import { inputClass } from '~/utils/form_styles'

type InputMode = 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    errors?: FormErrors
    errorKey?: string
    id?: string
    name?: string
    type?: InputMode | 'password' | 'number' | 'date' | 'datetime-local'
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
    disabled: false,
    required: false,
    readonly: false,
  }
)

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const attrs = useAttrs()
const slots = useSlots()
const hasTrailing = computed(() => Boolean(slots.trailing))
const inputPaddingClass = computed(() => (hasTrailing.value ? 'pr-24' : ''))

const resolvedError = computed(() => {
  if (props.error) return props.error
  const key = props.errorKey ?? nameToErrorKey(props.name ?? '')
  return getFieldError(props.errors, key)
})

// Pass-through attrs: class/style go to the wrapper, everything else to the inner <input>.
const wrapperClass = computed(() => attrs.class)
const inputAttrs = computed(() => {
  const { class: _c, style: _s, ...rest } = attrs
  return rest
})
</script>

<template>
  <BaseField
    :label="label"
    :hint="hint"
    :error="resolvedError"
    :html-for="id"
    :class="wrapperClass"
  >
    <template v-if="$slots['label-right']" #label-right>
      <slot name="label-right" />
    </template>
    <div class="relative">
      <input
        v-bind="{
          ...(modelValue !== undefined ? { value: modelValue } : {}),
          ...inputAttrs,
        }"
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
