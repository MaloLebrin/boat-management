<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'

const props = withDefaults(
  defineProps<{
    variant?: 'info' | 'success' | 'warning' | 'danger'
    title?: string
  }>(),
  { variant: 'info', title: undefined }
)

const toneClass: Record<NonNullable<typeof props.variant>, string> = {
  info: 'bg-sky-50 border-sky-200',
  success: 'bg-mint-50 border-mint-200',
  warning: 'bg-peach-50 border-peach-200',
  danger: 'bg-[var(--color-danger-soft)] border-danger/30',
}

const badgeVariant: Record<NonNullable<typeof props.variant>, 'info' | 'success' | 'warning'> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'warning',
}
</script>

<template>
  <div
    :class="[
      'rounded-(--radius-card) border px-4 py-3 shadow-(--shadow-xs) transition-shadow duration-(--motion-fast) ease-premium hover:shadow-(--shadow-sm)',
      toneClass[variant],
    ]"
    role="status"
  >
    <div class="flex items-start gap-3">
      <BaseBadge :variant="badgeVariant[variant]">
        {{ variant }}
      </BaseBadge>
      <div class="min-w-0">
        <p v-if="title" class="text-sm font-semibold text-fg">
          {{ title }}
        </p>
        <div class="text-sm text-fg-muted">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

