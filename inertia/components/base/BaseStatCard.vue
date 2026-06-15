<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useT } from '~/composables/use_t'

const { t } = useT()

withDefaults(
  defineProps<{
    label: string
    value: string
    delta?: string
    tone?: 'neutral' | 'success' | 'info' | 'warning'
    href?: string
  }>(),
  { delta: undefined, tone: 'neutral', href: undefined }
)
</script>

<template>
  <component
    :is="href ? 'a' : 'div'"
    :href="href || undefined"
    class="rounded-(--radius-card) border border-border bg-surface-elevated p-5 shadow-(--shadow-xs) transition-[transform,box-shadow] duration-(--motion-fast) ease-premium hover:shadow-(--shadow-sm) hover:scale-[1.01]"
    :class="href ? 'block cursor-pointer' : ''"
  >
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-1.5 min-w-0">
        <span v-if="$slots.icon" class="shrink-0 text-fg-muted">
          <slot name="icon" />
        </span>
        <p class="text-sm font-semibold text-fg-muted truncate">
          {{ label }}
        </p>
      </div>
      <BaseBadge :variant="tone">
        {{ t(`common.tone.${tone}`) }}
      </BaseBadge>
    </div>
    <p class="mt-3 font-display text-3xl font-bold tracking-tight text-fg">
      {{ value }}
    </p>
    <p v-if="delta" class="mt-1 text-sm text-fg-subtle">
      {{ delta }}
    </p>
  </component>
</template>
