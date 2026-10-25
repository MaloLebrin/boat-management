<script setup lang="ts">
import { computed } from 'vue'
import { useMockTicker } from '~/composables/use_mock_ticker'

/**
 * Cadran de la maquette Instruments (#995), deux variantes :
 *
 * - `compass` (cap) : rose des vents qui tourne sous un repère fixe, le N
 *   suit donc le cap comme sur un compas de route ;
 * - `wind` (vent apparent) : bateau vu du dessus, étrave en haut, et une
 *   flèche qui pointe vers lui depuis l'angle d'où vient le vent.
 *
 * L'angle oscille autour de `angle` comme sur un vrai instrument. Les
 * graduations sont des traits, sans lettre à traduire (le « N » est universel).
 */
const props = defineProps<{
  variant: 'compass' | 'wind'
  label: string
  value: string
  unit: string
  angle: number
  sway: number
  delay?: number
}>()

const current = useMockTicker(props.angle, { amplitude: props.sway, intervalMs: 1100 })
const rotation = computed(
  () => `rotate(${props.variant === 'compass' ? -current.value : current.value}deg)`
)
const degrees = computed(() => `${Math.round(((current.value % 360) + 360) % 360)}°`)
const ticks = Array.from({ length: 12 }, (_, index) => index * 30)
</script>

<template>
  <div
    class="mock-pop flex items-center gap-2.5 rounded-xl border border-bone bg-surface-elevated p-2 shadow-sm"
    :style="{ animationDelay: `${delay ?? 0}ms` }"
    :data-variant="variant"
    data-testid="mock-instruments-tile"
  >
    <svg viewBox="0 0 48 48" class="h-12 w-12 shrink-0" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="currentColor" class="text-surface-muted" />
      <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" class="text-border" />

      <g v-if="variant === 'compass'">
        <g class="mock-rotor" :style="{ transform: rotation, transformOrigin: '24px 24px' }">
          <g v-for="tick in ticks" :key="tick" :transform="`rotate(${tick} 24 24)`">
            <path
              :d="tick % 90 === 0 ? 'M24 3v5' : 'M24 3v3'"
              stroke="currentColor"
              stroke-width="1.2"
              stroke-linecap="round"
              class="text-fg-subtle"
            />
          </g>
          <text
            x="24"
            y="17"
            text-anchor="middle"
            font-size="7"
            font-weight="700"
            fill="currentColor"
            class="text-coral-500"
          >
            N
          </text>
          <path d="M24 27l-3 7h6z" fill="currentColor" class="text-fg-subtle" opacity="0.5" />
        </g>
        <path d="M24 0.5l-3 5h6z" fill="currentColor" class="text-fg" />
      </g>

      <g v-else>
        <g v-for="tick in ticks" :key="tick" :transform="`rotate(${tick} 24 24)`">
          <path
            :d="tick === 0 ? 'M24 3v5' : 'M24 3v3'"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linecap="round"
            class="text-fg-subtle"
          />
        </g>
        <path
          d="M24 14c4 4 5 12 4 20l-4 2-4-2c-1-8 0-16 4-20z"
          fill="currentColor"
          class="text-fg-subtle"
          opacity="0.45"
        />
        <g class="mock-rotor" :style="{ transform: rotation, transformOrigin: '24px 24px' }">
          <path
            d="M24 5v14"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            class="text-coral-500"
          />
          <path d="M24 21l-4-7h8z" fill="currentColor" class="text-coral-500" />
        </g>
      </g>
      <circle cx="24" cy="24" r="1.6" fill="currentColor" class="text-fg" />
    </svg>
    <div>
      <p class="text-fg-muted">{{ label }}</p>
      <p class="font-display text-lg leading-tight text-fg">
        {{ value }}<span class="ml-0.5 text-[9px] text-fg-subtle">{{ unit }}</span>
        <span class="ml-1.5 font-sans text-[9px] text-fg-muted" data-testid="mock-dial-degrees">
          {{ degrees }}
        </span>
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
@keyframes mock-rotor-in {
  from {
    transform: rotate(0deg);
  }
}
.mock-pop {
  animation: mock-pop 520ms var(--ease-premium, ease-out) both;
}
.mock-rotor {
  transition: transform 1000ms cubic-bezier(0.34, 1.4, 0.5, 1);
  animation: mock-rotor-in 1600ms cubic-bezier(0.34, 1.4, 0.5, 1) 450ms both;
}
</style>
