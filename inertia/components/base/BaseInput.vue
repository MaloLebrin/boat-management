<script setup lang="ts">
import BaseField from '~/components/base/BaseField.vue'
import { inputClass } from '~/utils/form_styles'

withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    id?: string
    name?: string
    type?: string
    autocomplete?: string
    placeholder?: string
    modelValue?: string
    disabled?: boolean
  }>(),
  {
    type: 'text',
    modelValue: '',
    disabled: false,
  }
)

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <BaseField :label="label" :hint="hint" :error="error" :html-for="id">
    <input
      :id="id"
      :name="name"
      :type="type"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      :disabled="disabled"
      :value="modelValue"
      :data-invalid="error ? 'true' : undefined"
      :aria-invalid="error ? 'true' : undefined"
      :class="[
        inputClass,
        'transition-[box-shadow,transform] duration-(--motion-fast) ease-premium focus:shadow-(--shadow-xs)',
      ]"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </BaseField>
</template>
