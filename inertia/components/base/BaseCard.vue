<script setup lang="ts">
defineProps<{
  padded?: boolean
}>()
</script>

<template>
  <div
    class="rounded-[var(--radius-card)] border border-border bg-surface-elevated shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]"
  >
    <div v-if="$slots.header" class="border-b border-border px-6 py-4">
      <slot name="header" />
    </div>
    <div :class="padded !== false ? 'px-6 py-5' : ''">
      <slot />
    </div>
    <div v-if="$slots.footer" class="border-t border-border px-6 py-4">
      <slot name="footer" />
    </div>
  </div>
</template>
