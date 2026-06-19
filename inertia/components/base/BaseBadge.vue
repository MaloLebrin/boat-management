<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
  }>(),
  { variant: 'neutral' }
)

const variantClass: Record<NonNullable<typeof props.variant>, string> = {
  neutral: 'bg-lilac-100 text-lilac-800 ring-1 ring-lilac-200',
  info: 'bg-sky-100 text-sky-800 ring-1 ring-sky-200',
  success: 'bg-mint-100 text-mint-800 ring-1 ring-mint-200',
  warning: 'bg-peach-100 text-peach-800 ring-1 ring-peach-200',
  danger: 'bg-red-100 text-red-800 ring-1 ring-red-200',
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
      variantClass[variant],
    ]"
  >
    <slot />
  </span>
</template>
