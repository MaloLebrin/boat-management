<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useMockTicker } from '~/composables/use_mock_ticker'

/**
 * Jauge en arc de la maquette Instruments (#995) : l'arc se dessine à
 * l'entrée puis suit la valeur simulée, qui vit autour de `base`. Couleur via
 * `tone` (classe `text-*` sur jeton, l'arc est en `currentColor`).
 */
const props = defineProps<{
  label: string
  unit: string
  base: number
  min: number
  max: number
  amplitude: number
  tone: string
  icon: Component
  delay?: number
}>()

const value = useMockTicker(props.base, {
  amplitude: props.amplitude,
  min: props.min,
  max: props.max,
})
const fraction = computed(() => (value.value - props.min) / (props.max - props.min))
</script>

<template>
  <div
    class="mock-pop relative overflow-hidden rounded-xl border border-bone bg-surface-elevated px-2 pb-1.5 pt-2 shadow-sm"
    :style="{ animationDelay: `${delay ?? 0}ms` }"
    data-testid="mock-instruments-tile"
  >
    <p class="flex items-center gap-1 text-fg-muted">
      <component :is="icon" class="h-3 w-3 shrink-0" :class="tone" aria-hidden="true" />
      <span class="truncate">{{ label }}</span>
    </p>
    <svg viewBox="0 0 100 56" class="mx-auto mt-0.5 block w-full max-w-[110px]" aria-hidden="true">
      <path
        d="M 10 50 A 40 40 0 0 1 90 50"
        fill="none"
        stroke="currentColor"
        stroke-width="8"
        stroke-linecap="round"
        pathLength="1"
        class="text-surface-muted"
      />
      <path
        d="M 10 50 A 40 40 0 0 1 90 50"
        fill="none"
        stroke="currentColor"
        stroke-width="8"
        stroke-linecap="round"
        pathLength="1"
        class="mock-arc"
        :class="tone"
        :style="{ strokeDasharray: `${Math.max(0.02, Math.min(1, fraction))} 1` }"
      />
    </svg>
    <p class="-mt-4 text-center font-display text-lg leading-none text-fg">
      {{ Math.round(value) }}
    </p>
    <p class="mt-0.5 text-center text-[9px] text-fg-subtle">{{ unit }}</p>
  </div>
</template>

<style scoped>
@keyframes mock-pop {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes mock-arc-in {
  from {
    stroke-dasharray: 0.02 1;
  }
}
.mock-pop {
  animation: mock-pop 520ms var(--ease-premium, ease-out) both;
}
.mock-arc {
  transition: stroke-dasharray 1100ms var(--ease-premium, ease-out);
  animation: mock-arc-in 1500ms var(--ease-premium, ease-out) 350ms both;
}
</style>
