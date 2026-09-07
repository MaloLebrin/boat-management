<script setup lang="ts">
/**
 * Single row in an assistant action summary — <dt>label</dt><dd>value</dd>.
 * Renders nothing if `value` is null/undefined/empty string.
 */
defineProps<{ label: string; value: string | number | null | undefined }>()
</script>

<template>
  <div v-if="value !== null && value !== undefined && value !== ''" class="flex gap-1">
    <dt>{{ label }}</dt>
    <dd class="font-medium text-navy-100">{{ value }}</dd>
  </div>
</template>
