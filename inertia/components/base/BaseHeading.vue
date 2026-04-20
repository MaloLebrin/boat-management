<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    level?: 'display' | '1' | '2' | '3'
    as?: string
  }>(),
  { level: '1', as: undefined }
)

const tag = computed(() => {
  if (props.as) {
    return props.as
  }
  if (props.level === 'display') {
    return 'h1'
  }
  return `h${props.level}` as 'h1' | 'h2' | 'h3'
})

const levelClass: Record<NonNullable<typeof props.level>, string> = {
  display: 'font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl',
  '1': 'font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl',
  '2': 'font-display text-2xl font-semibold tracking-tight text-fg',
  '3': 'font-display text-xl font-semibold text-fg',
}
</script>

<template>
  <component :is="tag" :class="levelClass[level]">
    <slot />
  </component>
</template>
