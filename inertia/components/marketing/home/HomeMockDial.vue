<script setup lang="ts">
import { computed } from 'vue'
import { useMockTicker } from '~/composables/use_mock_ticker'

/**
 * Cadran de la maquette Instruments (#995) : cap ou vent, l'aiguille oscille
 * autour de `angle` comme sur un vrai instrument. Un cadran est un repère
 * visuel : les ticks sont les quatre points cardinaux, sans lettre à traduire.
 */
const props = defineProps<{
  label: string
  value: string
  unit: string
  angle: number
  sway: number
  delay?: number
}>()

const needle = useMockTicker(props.angle, { amplitude: props.sway, intervalMs: 1100 })
const rotation = computed(() => `rotate(${needle.value}deg)`)
</script>

<template>
  <div
    class="mock-pop flex items-center gap-2.5 rounded-xl border border-bone bg-surface-elevated p-2 shadow-sm"
    :style="{ animationDelay: `${delay ?? 0}ms` }"
    data-testid="mock-instruments-tile"
  >
    <svg viewBox="0 0 40 40" class="h-11 w-11 shrink-0" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" class="text-border" />
      <circle cx="20" cy="20" r="14" fill="currentColor" class="text-surface-muted" />
      <path
        d="M20 3v3M37 20h-3M20 37v-3M3 20h3"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        class="text-fg-subtle"
      />
      <g class="mock-needle" :style="{ transform: rotation, transformOrigin: '20px 20px' }">
        <path d="M20 7l3 13h-6z" fill="currentColor" class="text-coral-500" />
        <path d="M20 33l-3-13h6z" fill="currentColor" class="text-fg-subtle" />
      </g>
      <circle cx="20" cy="20" r="2" fill="currentColor" class="text-fg" />
    </svg>
    <div>
      <p class="text-fg-muted">{{ label }}</p>
      <p class="font-display text-lg leading-tight text-fg">
        {{ value }}<span class="ml-0.5 text-[9px] text-fg-subtle">{{ unit }}</span>
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
@keyframes mock-needle-in {
  from {
    transform: rotate(0deg);
  }
}
.mock-pop {
  animation: mock-pop 520ms var(--ease-premium, ease-out) both;
}
.mock-needle {
  transition: transform 1000ms cubic-bezier(0.34, 1.4, 0.5, 1);
  animation: mock-needle-in 1600ms cubic-bezier(0.34, 1.4, 0.5, 1) 450ms both;
}
</style>
