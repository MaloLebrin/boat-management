<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
  }>(),
  {
    variant: 'primary',
    size: 'md',
    disabled: false,
    type: 'button',
  }
)

const variantClass: Record<NonNullable<typeof props.variant>, string> = {
  primary:
    'bg-brand text-white shadow-sm hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  secondary:
    'border border-border-strong bg-surface-elevated text-fg shadow-sm hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  ghost:
    'text-fg-muted hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  danger:
    'bg-red-200 text-red-800 shadow-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-800/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
}

const sizeClass: Record<NonNullable<typeof props.size>, string> = {
  sm: 'h-8 rounded-[var(--radius-control)] px-3 text-xs font-semibold',
  md: 'h-10 rounded-[var(--radius-control)] px-4 text-sm font-semibold',
  lg: 'h-11 rounded-[var(--radius-control)] px-5 text-base font-semibold',
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="[
      'inline-flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
      variantClass[variant],
      sizeClass[size],
    ]"
  >
    <slot />
  </button>
</template>
