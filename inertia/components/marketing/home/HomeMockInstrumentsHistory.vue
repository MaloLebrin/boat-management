<script setup lang="ts">
import { ChartBarIcon } from '@heroicons/vue/24/outline'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useT } from '~/composables/use_t'

/**
 * Courbe d'historique **simulée** de la maquette Instruments (#995) : la courbe
 * se révèle de gauche à droite à l'entrée, puis le flux avance, un point toutes les 1,5 s, comme
 * des relevés qui arrivent. Couleurs en jetons via `currentColor` ; aucun
 * minuteur sous `prefers-reduced-motion`.
 */
const { t } = useT()

const WIDTH = 300
const HEIGHT = 40
const SIZE = 24
const series = ref<number[]>(
  Array.from({ length: SIZE }, (_, index) => 6 + index * 0.55 + Math.sin(index / 2.2) * 2)
)
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  timer = setInterval(() => {
    const last = series.value[series.value.length - 1]
    const next = Math.min(22, Math.max(2, last + (Math.random() - 0.35) * 2.2))
    series.value = [...series.value.slice(1), next]
  }, 1500)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const step = WIDTH / (SIZE - 1)
const points = computed(() =>
  series.value.map((y, index) => [index * step, HEIGHT - 3 - y * 1.6] as const)
)
const line = computed(() => points.value.map(([x, y]) => `${x},${y}`).join(' '))
const area = computed(() => `0,${HEIGHT} ${line.value} ${WIDTH},${HEIGHT}`)
const tip = computed(() => points.value[points.value.length - 1])
</script>

<template>
  <div
    class="mock-pop rounded-xl border border-bone bg-surface-elevated p-2 shadow-sm"
    data-testid="mock-history"
  >
    <p class="flex items-center justify-between text-fg-muted">
      <span class="flex items-center gap-1">
        <ChartBarIcon class="h-3 w-3 text-coral-500" aria-hidden="true" />
        {{ t('homePreview.mock.instruments.historySeries') }}
      </span>
      <span class="text-fg-subtle">{{ t('homePreview.mock.instruments.history') }}</span>
    </p>
    <svg
      class="mock-reveal mt-1 h-9 w-full text-coral-500"
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polygon class="mock-area" :points="area" fill="currentColor" />
      <polyline
        :points="line"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
      <circle :cx="tip[0] - 2" :cy="tip[1]" r="3" fill="currentColor" class="animate-pulse" />
    </svg>
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
@keyframes mock-reveal {
  from {
    clip-path: inset(0 100% 0 0);
  }
  to {
    clip-path: inset(0 0 0 0);
  }
}
@keyframes mock-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.14;
  }
}
.mock-pop {
  animation: mock-pop 520ms var(--ease-premium, ease-out) 650ms both;
}
.mock-reveal {
  animation: mock-reveal 1600ms var(--ease-premium, ease-out) 900ms both;
}
.mock-area {
  animation: mock-fade 900ms ease-out 2000ms both;
}
</style>
