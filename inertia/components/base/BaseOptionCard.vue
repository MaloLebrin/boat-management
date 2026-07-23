<script setup lang="ts">
interface Props {
  selected: boolean
  selectedClass?: string
  unselectedClass?: string
  disabled?: boolean
  ariaLabel?: string
}

withDefaults(defineProps<Props>(), {
  selectedClass: 'border-coral-500 bg-coral-50 text-coral-700',
  unselectedClass: 'border-bone bg-white text-fg hover:border-fg-subtle',
  disabled: false,
})

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    :class="[
      'rounded-xl border-2 transition-all duration-150',
      selected ? selectedClass : unselectedClass,
    ]"
    :disabled="disabled"
    :aria-label="ariaLabel"
    :aria-pressed="selected"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>
