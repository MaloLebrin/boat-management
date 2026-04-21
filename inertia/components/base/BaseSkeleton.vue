<script setup lang="ts">
withDefaults(
  defineProps<{
    widthClass?: string
    heightClass?: string
    roundedClass?: string
  }>(),
  {
    widthClass: 'w-full',
    heightClass: 'h-4',
    roundedClass: 'rounded-(--radius-control)',
  }
)
</script>

<template>
  <div
    :class="[
      'relative overflow-hidden bg-surface-muted shadow-(--shadow-xs)',
      widthClass,
      heightClass,
      roundedClass,
    ]"
    aria-hidden="true"
  >
    <div
      class="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-linear-to-r from-transparent via-white/60 to-transparent"
    />
  </div>
</template>
