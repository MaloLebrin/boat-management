<script setup lang="ts">
defineProps<{
  step: string
  title: string
  subtitle: string
}>()
</script>

<template>
  <div class="flex items-center gap-3">
    <span class="font-mono text-[11px] text-fg-subtle">{{ step }}</span>
    <div class="h-px flex-1 bg-bone" />
    <div class="text-right">
      <div class="text-[13px] font-semibold text-fg">{{ title }}</div>
      <div class="text-[11px] text-fg-muted">{{ subtitle }}</div>
    </div>
  </div>
</template>
