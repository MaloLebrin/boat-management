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
  SignalIcon,
} from '@heroicons/vue/24/outline'
import { useT } from '~/composables/use_t'

/**
 * Maquette de l'onglet Instruments (#995) : valeurs **simulées**, comme les
 * autres `HomeMock*`. Les nombres restent entiers pour ne dépendre d'aucune
 * locale ; seuls libellés et unités passent par `homePreview.mock.instruments.*`.
 * Les tuiles entrent l'une après l'autre et les jauges se remplissent ; le
 * `prefers-reduced-motion` global ramène ces animations à 1 ms.
 */
const { t } = useT()

const tiles = [
  { key: 'rpm', unitKey: 'rpmUnit', value: '2450', icon: Cog8ToothIcon },
  { key: 'engineHours', unit: 'h', value: '1284', icon: ClockIcon },
  { key: 'depth', unit: 'm', value: '7', icon: ArrowsUpDownIcon },
  { key: 'wind', unitKey: 'windUnit', value: '14', icon: CloudIcon },
] as const

const levels = [
  { key: 'voltage', value: 86, icon: BoltIcon, bar: 'bg-mint-600' },
  { key: 'tank', value: 62, icon: BeakerIcon, bar: 'bg-sky-300' },
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
      <span
        class="flex items-center gap-1 rounded-full bg-mint-100 px-2 py-0.5 text-[9px] font-medium text-mint-700"
      >
        <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-mint-600" aria-hidden="true" />
        {{ t('homePreview.mock.instruments.live') }}
      </span>
    </div>

    <div class="flex-1 overflow-hidden p-3">
      <div class="grid grid-cols-3 gap-2">
        <div
          v-for="(tile, index) in tiles"
          :key="tile.key"
          class="mock-pop rounded-lg border border-bone bg-surface-elevated p-2"
          :style="{ animationDelay: `${index * 90}ms` }"
          data-testid="mock-instruments-tile"
        >
          <p class="flex items-center gap-1 text-fg-muted">
            <component :is="tile.icon" class="h-3 w-3 text-coral-500" aria-hidden="true" />
            {{ t(`homePreview.mock.instruments.${tile.key}`) }}
          </p>
          <p class="mt-1 font-display text-lg text-fg">{{ tile.value }}</p>
          <p class="text-fg-subtle">
            {{ 'unitKey' in tile ? t(`homePreview.mock.instruments.${tile.unitKey}`) : tile.unit }}
          </p>
        </div>
        <div
          v-for="(level, index) in levels"
          :key="level.key"
          class="mock-pop rounded-lg border border-bone bg-surface-elevated p-2"
          :style="{ animationDelay: `${(index + tiles.length) * 90}ms` }"
          data-testid="mock-instruments-tile"
        >
          <p class="flex items-center gap-1 text-fg-muted">
            <component :is="level.icon" class="h-3 w-3 text-coral-500" aria-hidden="true" />
            {{ t(`homePreview.mock.instruments.${level.key}`) }}
          </p>
          <p class="mt-1 font-display text-lg text-fg">
            {{ level.value }}<span class="text-xs">%</span>
          </p>
          <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div
              class="mock-grow h-full rounded-full"
              :class="level.bar"
              :style="{ width: `${level.value}%` }"
            />
          </div>
        </div>
      </div>

      <p class="mb-1 mt-3 font-semibold uppercase tracking-wide text-fg-subtle">
        {{ t('homePreview.mock.instruments.alertsTitle') }}
      </p>
      <ul class="space-y-1.5" data-testid="mock-instruments-alerts">
        <li
          v-for="(alert, index) in alerts"
          :key="alert.key"
          class="mock-pop flex items-center gap-2 rounded-lg px-3 py-1.5 font-medium"
          :class="alert.tone"
          :style="{ animationDelay: `${(index + 6) * 90 + 150}ms` }"
        >
          <component :is="alert.icon" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span class="flex-1">{{ t(`homePreview.mock.instruments.${alert.key}`) }}</span>
          <span class="rounded-full bg-surface-elevated px-1.5 py-0.5 text-[8px] text-fg">
            {{ t(`homePreview.mock.instruments.${alert.level}`) }}
          </span>
        </li>
      </ul>

      <p class="mt-2 text-right text-fg-subtle">{{ t('homePreview.mock.instruments.synced') }}</p>
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
.mock-pop {
  animation: mock-pop 500ms var(--ease-premium, ease-out) both;
}
.mock-grow {
  transform-origin: left;
  animation: mock-grow 1100ms var(--ease-premium, ease-out) 400ms both;
}
</style>
