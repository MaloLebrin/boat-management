<script setup lang="ts">
defineProps<{
  label?: string
  hint?: string
  error?: string
  htmlFor?: string
}>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label
      v-if="label"
      :for="htmlFor"
      class="text-sm font-semibold text-fg"
    >
      {{ label }}
    </label>
    <div class="flex flex-col gap-1">
      <slot />
      <p v-if="hint && !error" class="text-xs text-fg-subtle">
        {{ hint }}
      </p>
      <p v-if="error" class="text-xs font-medium text-danger" role="alert">
        {{ error }}
      </p>
    </div>
  </div>
</template>
