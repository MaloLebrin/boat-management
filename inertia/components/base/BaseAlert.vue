<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'info' | 'success' | 'warning' | 'danger'
    title?: string
    dismissible?: boolean
    styled?: 'default' | 'bordered'
  }>(),
  {
    variant: 'info',
    title: undefined,
    dismissible: false,
    styled: 'default',
  }
)

const emit = defineEmits<{ dismiss: [] }>()

type Variant = NonNullable<typeof props.variant>

const containerClass = computed(() => {
  const base =
    'flex items-start gap-3 px-4 py-3 text-sm transition-shadow duration-(--motion-fast) ease-premium'

  const toneMap: Record<Variant, string> = {
    info: 'bg-sky-50 text-sky-800',
    success: 'bg-mint-50 text-mint-800',
    warning: 'bg-peach-50 text-peach-800',
    danger: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
  }

  const borderMap: Record<Variant, string> = {
    info: 'border-sky-200',
    success: 'border-mint-200',
    warning: 'border-peach-200',
    danger: 'border-[var(--color-danger)]/30',
  }

  if (props.styled === 'bordered') {
    return [base, 'rounded-lg border-l-4', toneMap[props.variant], borderMap[props.variant]]
  }

  return [
    base,
    'rounded-(--radius-card) border shadow-(--shadow-xs) hover:shadow-(--shadow-sm)',
    toneMap[props.variant],
    borderMap[props.variant],
  ]
})

const iconClass = computed<Record<Variant, string>>(() => ({
  info: 'text-sky-500',
  success: 'text-mint-600',
  warning: 'text-peach-700',
  danger: 'text-[var(--color-danger)]',
}))

const dismissHoverClass = computed<Record<Variant, string>>(() => ({
  info: 'hover:bg-sky-100 text-sky-600',
  success: 'hover:bg-mint-100 text-mint-700',
  warning: 'hover:bg-peach-100 text-peach-700',
  danger: 'hover:bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
}))

const ariaRole = computed(() =>
  props.variant === 'danger' || props.variant === 'warning' ? 'alert' : 'status'
)
</script>

<template>
  <div :class="containerClass" :role="ariaRole">
    <!-- Icon -->
    <div class="mt-0.5 shrink-0" :class="iconClass[variant]">
      <!-- Info -->
      <svg
        v-if="variant === 'info'"
        class="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <!-- Success -->
      <svg
        v-else-if="variant === 'success'"
        class="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <!-- Warning -->
      <svg
        v-else-if="variant === 'warning'"
        class="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <!-- Danger -->
      <svg
        v-else-if="variant === 'danger'"
        class="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        />
      </svg>
    </div>

    <!-- Content -->
    <div class="min-w-0 flex-1">
      <p v-if="title" class="font-semibold">
        {{ title }}
      </p>
      <div :class="title ? 'mt-0.5 opacity-90' : ''">
        <slot />
      </div>
      <div v-if="$slots.actions" class="mt-3 flex items-center gap-3">
        <slot name="actions" />
      </div>
    </div>

    <!-- Dismiss button -->
    <button
      v-if="dismissible"
      type="button"
      class="shrink-0 rounded p-1 transition-colors"
      :class="dismissHoverClass[variant]"
      aria-label="Fermer"
      @click="emit('dismiss')"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  </div>
</template>
