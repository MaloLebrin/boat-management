<script setup lang="ts">
import { useMockTicker } from '~/composables/use_mock_ticker'
import { useT } from '~/composables/use_t'

/**
 * Cibles AIS **simulées** de la maquette Instruments (#1009) : un petit radar
 * (bateau au centre, balayage qui tourne, trois navires) et la liste triée par
 * distance avec le CPA/TCPA, comme le vrai panneau. Le premier navire croise
 * devant (CPA 0,3 NM dans 8 min → « Risque », anneau qui pulse), le second est
 * à surveiller, le troisième s'éloigne. La distance du premier bouge, comme
 * un relevé qui arrive. Aucun minuteur sous `prefers-reduced-motion`.
 */
defineProps<{ delay?: number }>()

const { t } = useT()
const label = (key: string) => t(`homePreview.mock.instruments.${key}`)

interface MockTarget {
  name: string
  distanceNm: number
  cpaNm: number | null
  tcpaMin: number | null
  risk: 'danger' | 'watch' | 'none'
  /** Position polaire sur le radar (degrés depuis le nord, rayon 0–1). */
  bearing: number
  radius: number
  heading: number
}

const targets: MockTarget[] = [
  {
    name: 'Atlantis Star',
    distanceNm: 1.4,
    cpaNm: 0.3,
    tcpaMin: 8,
    risk: 'danger',
    bearing: 40,
    radius: 0.45,
    heading: 250,
  },
  {
    name: 'Pilot 3',
    distanceNm: 2.8,
    cpaNm: 0.8,
    tcpaMin: 17,
    risk: 'watch',
    bearing: 305,
    radius: 0.7,
    heading: 120,
  },
  {
    name: 'Belle Île',
    distanceNm: 4.1,
    cpaNm: null,
    tcpaMin: null,
    risk: 'none',
    bearing: 160,
    radius: 0.92,
    heading: 175,
  },
]

const closest = useMockTicker(targets[0].distanceNm, { amplitude: 0.06, min: 1.1, max: 1.6 })

const RADIUS = 28
const CENTER = 32
const position = (target: MockTarget) => {
  const rad = ((target.bearing - 90) * Math.PI) / 180
  return {
    x: CENTER + Math.cos(rad) * target.radius * RADIUS,
    y: CENTER + Math.sin(rad) * target.radius * RADIUS,
  }
}

const tone: Record<MockTarget['risk'], string> = {
  danger: 'text-coral-500',
  watch: 'text-amber-600',
  none: 'text-fg-muted',
}
const badge: Record<MockTarget['risk'], string> = {
  danger: 'bg-coral-100 text-coral-700',
  watch: 'bg-amber-100 text-amber-700',
  none: '',
}

const distance = (target: MockTarget, index: number) =>
  `${(index === 0 ? closest.value : target.distanceNm).toFixed(1)} ${label('aisNm')}`

const cpa = (target: MockTarget) =>
  target.cpaNm === null || target.tcpaMin === null
    ? label('aisDiverging')
    : label('aisCpa')
        .replace('{cpa}', target.cpaNm.toFixed(1))
        .replace('{minutes}', String(target.tcpaMin))
</script>

<template>
  <div
    class="mock-pop flex gap-2 rounded-xl border border-bone bg-surface-elevated p-2 shadow-sm"
    :style="{ animationDelay: `${delay ?? 0}ms` }"
    data-testid="mock-instruments-ais"
  >
    <svg viewBox="0 0 64 64" class="h-16 w-16 shrink-0 text-fg-subtle" aria-hidden="true">
      <circle :cx="CENTER" :cy="CENTER" :r="RADIUS" class="fill-sky-50" />
      <circle
        v-for="r in [28, 18.5, 9]"
        :key="r"
        :cx="CENTER"
        :cy="CENTER"
        :r="r"
        fill="none"
        stroke="currentColor"
        stroke-width="0.6"
        opacity="0.6"
      />
      <line
        :x1="CENTER"
        :y1="4"
        :x2="CENTER"
        :y2="60"
        stroke="currentColor"
        stroke-width="0.5"
        opacity="0.4"
      />
      <line
        :x1="4"
        :y1="CENTER"
        :x2="60"
        :y2="CENTER"
        stroke="currentColor"
        stroke-width="0.5"
        opacity="0.4"
      />
      <path
        class="mock-radar-sweep text-sky-300"
        d="M32 32 L32 4 A28 28 0 0 1 51.8 12.2 Z"
        fill="currentColor"
        opacity="0.35"
      />
      <g v-for="target in targets" :key="target.name" :class="tone[target.risk]">
        <circle
          v-if="target.risk === 'danger'"
          :cx="position(target).x"
          :cy="position(target).y"
          r="4"
          fill="none"
          stroke="currentColor"
          stroke-width="1"
          class="mock-radar-ping"
        />
        <polygon
          points="0,-3.5 2.8,3 -2.8,3"
          fill="currentColor"
          :transform="`translate(${position(target).x} ${position(target).y}) rotate(${target.heading})`"
        />
      </g>
      <polygon
        points="0,-4 3,3.5 -3,3.5"
        class="fill-navy-800"
        :transform="`translate(${CENTER} ${CENTER}) rotate(212)`"
      />
    </svg>

    <div class="min-w-0 flex-1">
      <p
        class="mb-1 flex items-center justify-between font-semibold uppercase tracking-wide text-fg-subtle"
      >
        <span>{{ label('aisTitle') }}</span>
        <span class="normal-case tracking-normal">{{
          label('aisCount').replace('{count}', '6')
        }}</span>
      </p>
      <ul class="space-y-0.5">
        <li
          v-for="(target, index) in targets"
          :key="target.name"
          class="flex min-w-0 items-center gap-1.5"
          data-testid="mock-instruments-ais-row"
        >
          <span class="shrink-0 font-medium text-fg">{{ target.name }}</span>
          <span
            v-if="target.risk !== 'none'"
            class="shrink-0 rounded-full px-1.5 py-px text-[8px] font-semibold"
            :class="badge[target.risk]"
          >
            {{ label(target.risk === 'danger' ? 'aisDanger' : 'aisWatch') }}
          </span>
          <span class="min-w-0 truncate text-fg-subtle">
            <span class="tabular-nums text-fg-muted">{{ distance(target, index) }}</span>
            · {{ cpa(target) }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
@keyframes mock-pop {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.mock-pop {
  animation: mock-pop 520ms var(--ease-premium, ease-out) both;
}
@keyframes mock-radar-sweep {
  to {
    transform: rotate(360deg);
  }
}
.mock-radar-sweep {
  transform-box: view-box;
  transform-origin: 32px 32px;
  animation: mock-radar-sweep 4s linear infinite;
}
@keyframes mock-radar-ping {
  0% {
    transform: scale(0.6);
    opacity: 0.9;
  }
  100% {
    transform: scale(2.4);
    opacity: 0;
  }
}
.mock-radar-ping {
  transform-box: fill-box;
  transform-origin: center;
  animation: mock-radar-ping 1.6s ease-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .mock-radar-sweep,
  .mock-radar-ping {
    animation: none;
  }
}
</style>
