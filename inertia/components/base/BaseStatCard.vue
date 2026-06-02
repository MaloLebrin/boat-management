<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'

withDefaults(
  defineProps<{
    label: string
    value: string
    delta?: string
    tone?: 'neutral' | 'success' | 'info' | 'warning'
  }>(),
  { delta: undefined, tone: 'neutral' }
)
</script>

<template>
  <div
    class="rounded-(--radius-card) border border-border bg-surface-elevated p-5 shadow-(--shadow-xs) transition-[transform,box-shadow] duration-(--motion-fast) ease-premium hover:shadow-(--shadow-sm) hover:scale-[1.01]"
  >
    <div class="flex items-center justify-between gap-3">
      <p class="text-sm font-semibold text-fg-muted">
        {{ label }}
      </p>
      <BaseBadge :variant="tone">
        {{ tone }}
      </BaseBadge>
    </div>
    <p class="mt-3 font-display text-3xl font-bold tracking-tight text-fg">
      {{ value }}
    </p>
    <p v-if="delta" class="mt-1 text-sm text-fg-subtle">
      {{ delta }}
    </p>
  </div>
</template>
