<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'

defineProps<{
  title: string
  description?: string
  actionLabel?: string
}>()

defineEmits<{
  (e: 'action'): void
}>()
</script>

<template>
  <div
    class="rounded-(--radius-card) border border-border bg-surface-elevated p-6 shadow-(--shadow-xs)"
  >
    <div class="flex items-start gap-4">
      <div
        class="flex h-11 w-11 items-center justify-center rounded-(--radius-control) bg-lilac-100 text-lilac-800 ring-1 ring-lilac-200"
        aria-hidden="true"
      >
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm1 11H9v-2h2v2Zm0-4H9V5h2v4Z" />
        </svg>
      </div>
      <div class="min-w-0">
        <p class="font-display text-base font-semibold text-fg">
          {{ title }}
        </p>
        <p v-if="description" class="mt-1 text-sm text-fg-muted">
          {{ description }}
        </p>
        <div v-if="actionLabel" class="mt-4">
          <BaseButton size="sm" type="button" @click="$emit('action')">
            {{ actionLabel }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
