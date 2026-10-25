<script setup lang="ts">
import {
  ArrowsUpDownIcon,
  BeakerIcon,
  BoltIcon,
  ClockIcon,
  CloudIcon,
  Cog8ToothIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  FireIcon,
  MapPinIcon,
  SignalIcon,
  WifiIcon,
} from '@heroicons/vue/24/outline'
import { useT } from '~/composables/use_t'
import HomeMockInstrumentsHistory from './HomeMockInstrumentsHistory.vue'

/**
 * Maquette de l'onglet Instruments (#995) : valeurs **simulées**, comme les
 * autres `HomeMock*`. Les nombres restent entiers pour ne dépendre d'aucune
 * locale ; seuls libellés et unités passent par `homePreview.mock.instruments.*`.
 * Chaque tuile correspond à une mesure réellement lue par l'onglet. Les tuiles
 * entrent l'une après l'autre, les jauges se remplissent et les cadrans
 * tournent vers leur valeur ; le `prefers-reduced-motion` global ramène ces
 * animations à 1 ms.
 */
const { t } = useT()

const tiles = [
  { key: 'rpm', unitKey: 'rpmUnit', value: '2450', icon: Cog8ToothIcon },
  { key: 'engineHours', unit: 'h', value: '1284', icon: ClockIcon },
  { key: 'coolant', unit: '°C', value: '82', icon: FireIcon },
  { key: 'oilPressure', unit: 'bar', value: '4', icon: Cog8ToothIcon },
  { key: 'speed', unitKey: 'windUnit', value: '6', icon: MapPinIcon },
  { key: 'depth', unit: 'm', value: '7', icon: ArrowsUpDownIcon },
  { key: 'waterTemp', unit: '°C', value: '19', icon: CloudIcon },
  { key: 'voltage', unit: '%', value: '86', icon: BoltIcon, bar: 86, tone: 'bg-mint-600' },
] as const

/** Cadrans : angle en degrés, la flèche tourne de 0° jusqu'à lui. */
const dials = [
  { key: 'heading', value: '212', angle: 212 },
  { key: 'apparentWind', value: '14', angle: 48, unitKey: 'windUnit' },
] as const

const levels = [
  { key: 'tank', value: 62, icon: BeakerIcon, bar: 'bg-sky-300' },
  { key: 'waterTank', value: 78, icon: BeakerIcon, bar: 'bg-sky-300' },
  { key: 'blackWater', value: 24, icon: BeakerIcon, bar: 'bg-amber-400' },
] as const

const alerts = [
  {
    key: 'alert',
    icon: ExclamationCircleIcon,
    tone: 'bg-coral-100 text-coral-700',
    level: 'critical',
  },
  {
    key: 'batteryLow',
    icon: ExclamationTriangleIcon,
    tone: 'bg-amber-100 text-amber-700',
    level: 'warning',
  },
] as const

const STEP_MS = 70
</script>

<template>
  <div
    class="flex h-full w-full flex-col overflow-hidden rounded-lg bg-cream"
    style="font-size: 10px"
  >
    <div
      class="flex items-center justify-between border-b border-bone bg-surface-elevated px-4 py-2"
    >
      <p class="flex items-center gap-1.5 font-semibold text-fg">
        <SignalIcon class="h-3.5 w-3.5 text-coral-500" aria-hidden="true" />
        {{ t('homePreview.mock.instruments.title') }}
      </p>
      <span class="flex items-center gap-2">
        <WifiIcon class="h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />
        <span
          class="flex items-center gap-1 rounded-full bg-mint-100 px-2 py-0.5 text-[9px] font-medium text-mint-700"
        >
          <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-mint-600" aria-hidden="true" />
          {{ t('homePreview.mock.instruments.live') }}
        </span>
      </span>
    </div>

    <div class="flex-1 overflow-hidden p-3">
      <div class="grid grid-cols-4 gap-1.5">
        <div
          v-for="(tile, index) in tiles"
          :key="tile.key"
          class="mock-pop rounded-lg border border-bone bg-surface-elevated p-1.5"
          :style="{ animationDelay: `${index * STEP_MS}ms` }"
          data-testid="mock-instruments-tile"
        >
          <p class="flex items-center gap-1 truncate text-fg-muted">
            <component :is="tile.icon" class="h-3 w-3 shrink-0 text-coral-500" aria-hidden="true" />
            <span class="truncate">{{ t(`homePreview.mock.instruments.${tile.key}`) }}</span>
          </p>
          <p class="mt-0.5 font-display text-base text-fg">
            {{ tile.value }}
            <span class="text-[9px] text-fg-subtle">
              {{
                'unitKey' in tile ? t(`homePreview.mock.instruments.${tile.unitKey}`) : tile.unit
              }}
            </span>
          </p>
          <div v-if="'bar' in tile" class="mt-1 h-1 overflow-hidden rounded-full bg-surface-muted">
            <div
              class="mock-grow h-full rounded-full"
              :class="tile.tone"
              :style="{ width: `${tile.bar}%` }"
            />
          </div>
        </div>

        <div
          v-for="(dial, index) in dials"
          :key="dial.key"
          class="mock-pop col-span-2 flex items-center gap-2 rounded-lg border border-bone bg-surface-elevated p-1.5"
          :style="{ animationDelay: `${(tiles.length + index) * STEP_MS}ms` }"
          data-testid="mock-instruments-tile"
        >
          <span
            class="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted"
            aria-hidden="true"
          >
            <span
              class="mock-spin absolute h-8 w-0.5"
              :style="{ '--dial-angle': `${dial.angle}deg` }"
            >
              <span class="block h-3.5 w-0.5 rounded-full bg-coral-500" />
            </span>
            <span class="h-1.5 w-1.5 rounded-full bg-fg-subtle" />
          </span>
          <div>
            <p class="text-fg-muted">{{ t(`homePreview.mock.instruments.${dial.key}`) }}</p>
            <p class="font-display text-base text-fg">
              {{ dial.value }}
              <span class="text-[9px] text-fg-subtle">
                {{ 'unitKey' in dial ? t(`homePreview.mock.instruments.${dial.unitKey}`) : '°' }}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div class="mt-1.5 grid grid-cols-3 gap-1.5">
        <div
          v-for="(level, index) in levels"
          :key="level.key"
          class="mock-pop rounded-lg border border-bone bg-surface-elevated p-1.5"
          :style="{ animationDelay: `${(tiles.length + dials.length + index) * STEP_MS}ms` }"
          data-testid="mock-instruments-tile"
        >
          <p class="flex items-center gap-1 text-fg-muted">
            <component
              :is="level.icon"
              class="h-3 w-3 shrink-0 text-coral-500"
              aria-hidden="true"
            />
            <span class="truncate">{{ t(`homePreview.mock.instruments.${level.key}`) }}</span>
          </p>
          <p class="mt-0.5 font-display text-base text-fg">
            {{ level.value }}<span class="text-[9px] text-fg-subtle">%</span>
          </p>
          <div class="mt-1 h-1 overflow-hidden rounded-full bg-surface-muted">
            <div
              class="mock-grow h-full rounded-full"
              :class="level.bar"
              :style="{ width: `${level.value}%` }"
            />
          </div>
        </div>
      </div>

      <HomeMockInstrumentsHistory class="mt-1.5" />

      <p class="mb-1 mt-2 font-semibold uppercase tracking-wide text-fg-subtle">
        {{ t('homePreview.mock.instruments.alertsTitle') }}
      </p>
      <ul class="space-y-1" data-testid="mock-instruments-alerts">
        <li
          v-for="(alert, index) in alerts"
          :key="alert.key"
          class="mock-pop flex items-center gap-2 rounded-lg px-3 py-1 font-medium"
          :class="alert.tone"
          :style="{
            animationDelay: `${(tiles.length + dials.length + levels.length + index) * STEP_MS + 150}ms`,
          }"
        >
          <component :is="alert.icon" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span class="flex-1">{{ t(`homePreview.mock.instruments.${alert.key}`) }}</span>
          <span class="rounded-full bg-surface-elevated px-1.5 py-0.5 text-[8px] text-fg">
            {{ t(`homePreview.mock.instruments.${alert.level}`) }}
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
    transform: translateY(8px) scale(0.97);
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
@keyframes mock-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(var(--dial-angle));
  }
}
.mock-pop {
  animation: mock-pop 500ms var(--ease-premium, ease-out) both;
}
.mock-grow {
  transform-origin: left;
  animation: mock-grow 1100ms var(--ease-premium, ease-out) 400ms both;
}
.mock-spin {
  transform: rotate(var(--dial-angle));
  animation: mock-spin 1400ms var(--ease-premium, ease-out) 300ms both;
}
</style>
