<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'

defineProps<{
  page: number
  pageCount: number
}>()

defineEmits<{
  (e: 'update:page', value: number): void
}>()
</script>

<template>
  <div class="flex items-center justify-between gap-4 rounded-(--radius-card) border border-border bg-surface-elevated px-4 py-3 shadow-(--shadow-xs)">
    <p class="text-sm text-fg-muted">
      Page <span class="font-semibold text-fg">{{ page }}</span> / {{ pageCount }}
    </p>
    <div class="flex items-center gap-2">
      <BaseButton
        variant="secondary"
        size="sm"
        :disabled="page <= 1"
        @click="$emit('update:page', page - 1)"
      >
        Prev
      </BaseButton>
      <BaseButton
        variant="secondary"
        size="sm"
        :disabled="page >= pageCount"
        @click="$emit('update:page', page + 1)"
      >
        Next
      </BaseButton>
    </div>
  </div>
</template>

