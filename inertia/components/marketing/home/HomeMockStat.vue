<script setup lang="ts">
import type { Component } from 'vue'
import { useMockTicker } from '~/composables/use_mock_ticker'

/**
 * Tuile de mesure de la maquette Instruments (#995) : pastille d'icône,
 * libellé, valeur simulée qui vit autour de `base`.
 */
const props = defineProps<{
  label: string
  unit: string
  base: number
  amplitude: number
  icon: Component
  chip: string
  delay?: number
}>()

const value = useMockTicker(props.base, { amplitude: props.amplitude, min: 0 })
</script>

<template>
  <div
    class="mock-pop flex items-center gap-2 rounded-xl border border-bone bg-surface-elevated p-2 shadow-sm"
    :style="{ animationDelay: `${delay ?? 0}ms` }"
    data-testid="mock-instruments-tile"
  >
    <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" :class="chip">
      <component :is="icon" class="h-4 w-4" aria-hidden="true" />
    </span>
    <div class="min-w-0">
      <p class="truncate text-fg-muted">{{ label }}</p>
      <p class="font-display text-base leading-tight text-fg">
        {{ Math.round(value) }}<span class="ml-0.5 text-[9px] text-fg-subtle">{{ unit }}</span>
      </p>
    </div>
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
.mock-pop {
  animation: mock-pop 520ms var(--ease-premium, ease-out) both;
}
</style>
