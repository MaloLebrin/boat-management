<script setup lang="ts">
import { ChartBarIcon } from '@heroicons/vue/24/outline'
import { useT } from '~/composables/use_t'

/**
 * Courbe d'historique **simulée** de la maquette Instruments (#995) : la ligne
 * se dessine (`stroke-dashoffset`) puis l'aire s'estompe. Couleurs en jetons,
 * via `currentColor` ; `prefers-reduced-motion` ramène l'animation à 1 ms.
 */
const { t } = useT()

const POINTS = [13, 12, 14, 11, 12, 9, 10, 6, 7, 5, 8, 4, 5, 3, 6, 4]
const WIDTH = 300
const HEIGHT = 40
const step = WIDTH / (POINTS.length - 1)
const line = POINTS.map((y, index) => `${index * step},${y * 2.4 + 4}`).join(' ')
const area = `0,${HEIGHT} ${line} ${WIDTH},${HEIGHT}`
</script>

<template>
  <div class="rounded-lg border border-bone bg-surface-elevated p-1.5" data-testid="mock-history">
    <p class="flex items-center justify-between text-fg-muted">
      <span class="flex items-center gap-1">
        <ChartBarIcon class="h-3 w-3 text-coral-500" aria-hidden="true" />
        {{ t('homePreview.mock.instruments.historySeries') }}
      </span>
      <span class="text-fg-subtle">{{ t('homePreview.mock.instruments.history') }}</span>
    </p>
    <svg
      class="mt-1 h-8 w-full text-coral-500"
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polygon class="mock-area" :points="area" fill="currentColor" />
      <polyline
        class="mock-line"
        :points="line"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
        pathLength="1"
      />
    </svg>
  </div>
</template>

<style scoped>
@keyframes mock-draw {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes mock-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.12;
  }
}
.mock-line {
  stroke-dasharray: 1;
  animation: mock-draw 1600ms var(--ease-premium, ease-out) 600ms both;
}
.mock-area {
  animation: mock-fade 900ms ease-out 1700ms both;
}
</style>
