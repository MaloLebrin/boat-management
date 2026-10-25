<script setup lang="ts">
import { BeakerIcon } from '@heroicons/vue/24/outline'

/** Niveau de réservoir de la maquette Instruments (#995) : barre qui se remplit puis brille. */
defineProps<{
  label: string
  value: number
  bar: string
  delay?: number
}>()
</script>

<template>
  <div
    class="mock-pop rounded-xl border border-bone bg-surface-elevated p-2 shadow-sm"
    :style="{ animationDelay: `${delay ?? 0}ms` }"
    data-testid="mock-instruments-tile"
  >
    <p class="flex items-center gap-1 text-fg-muted">
      <BeakerIcon class="h-3 w-3 shrink-0 text-coral-500" aria-hidden="true" />
      <span class="truncate">{{ label }}</span>
    </p>
    <p class="mt-0.5 font-display text-base leading-tight text-fg">
      {{ value }}<span class="ml-0.5 text-[9px] text-fg-subtle">%</span>
    </p>
    <div class="relative mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted">
      <div
        class="mock-grow relative h-full overflow-hidden rounded-full"
        :class="bar"
        :style="{ width: `${value}%` }"
      >
        <span class="mock-shine absolute inset-y-0 w-1/3 bg-white/40" />
      </div>
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
@keyframes mock-grow {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}
@keyframes mock-shine {
  from {
    transform: translateX(-120%);
  }
  to {
    transform: translateX(420%);
  }
}
.mock-pop {
  animation: mock-pop 520ms var(--ease-premium, ease-out) both;
}
.mock-grow {
  transform-origin: left;
  animation: mock-grow 1100ms var(--ease-premium, ease-out) 600ms both;
}
.mock-shine {
  animation: mock-shine 2800ms ease-in-out 1700ms infinite;
}
</style>
