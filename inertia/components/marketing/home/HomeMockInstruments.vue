<script setup lang="ts">
import {
  ArrowsUpDownIcon,
  BoltIcon,
  ClockIcon,
  Cog8ToothIcon,
  FireIcon,
  MapPinIcon,
  SignalIcon,
  WifiIcon,
} from '@heroicons/vue/24/outline'
import { useT } from '~/composables/use_t'
import HomeMockAisTargets from './HomeMockAisTargets.vue'
import HomeMockAlerts from './HomeMockAlerts.vue'
import HomeMockDial from './HomeMockDial.vue'
import HomeMockGauge from './HomeMockGauge.vue'
import HomeMockInstrumentsHistory from './HomeMockInstrumentsHistory.vue'
import HomeMockLevel from './HomeMockLevel.vue'
import HomeMockStat from './HomeMockStat.vue'

/**
 * Maquette de l'onglet Instruments (#995) : valeurs **simulées**, comme les
 * autres `HomeMock*`, mais vivantes. Les jauges se dessinent puis suivent des
 * valeurs qui bougent, les aiguilles oscillent, la courbe avance et les
 * réservoirs brillent. Chaque widget correspond à une mesure réellement lue par
 * l'onglet ; l'histoire est cohérente (moteur chaud, batterie qui baisse, d'où
 * les alertes) et le radar AIS signale un navire qui croise devant (#1009). Libellés et unités passent par
 * `homePreview.mock.instruments.*` ; `prefers-reduced-motion` coupe les
 * minuteurs et ramène les animations CSS à 1 ms.
 */
const { t } = useT()
const label = (key: string) => t(`homePreview.mock.instruments.${key}`)

const STEP = 70

const stats = [
  {
    key: 'speed',
    unitKey: 'windUnit',
    base: 6,
    amp: 1,
    icon: MapPinIcon,
    chip: 'bg-sky-100 text-sky-700',
  },
  {
    key: 'depth',
    unit: 'm',
    base: 7,
    amp: 1,
    icon: ArrowsUpDownIcon,
    chip: 'bg-mint-100 text-mint-700',
  },
  {
    key: 'engineHours',
    unit: 'h',
    base: 1284,
    amp: 0,
    icon: ClockIcon,
    chip: 'bg-coral-100 text-coral-700',
  },
  {
    key: 'oilPressure',
    unit: 'bar',
    base: 4,
    amp: 0.4,
    icon: Cog8ToothIcon,
    chip: 'bg-amber-100 text-amber-700',
  },
] as const

const levels = [
  { key: 'tank', value: 62, bar: 'bg-sky-300' },
  { key: 'waterTank', value: 78, bar: 'bg-sky-300' },
  { key: 'blackWater', value: 24, bar: 'bg-amber-400' },
] as const
</script>

<template>
  <div
    class="flex h-full w-full flex-col overflow-hidden rounded-lg bg-cream"
    style="font-size: 10px"
  >
    <div
      class="flex items-center justify-between bg-gradient-to-r from-navy-800 to-navy-900 px-4 py-2 text-white"
    >
      <p class="flex items-center gap-1.5 font-semibold">
        <SignalIcon class="h-3.5 w-3.5 text-coral-400" aria-hidden="true" />
        {{ label('title') }}
      </p>
      <span class="flex items-center gap-2">
        <WifiIcon class="h-3.5 w-3.5 text-navy-100" aria-hidden="true" />
        <span
          class="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-medium"
        >
          <span class="relative flex h-1.5 w-1.5" aria-hidden="true">
            <span
              class="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint-300 opacity-75"
            />
            <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint-300" />
          </span>
          {{ label('live') }}
        </span>
      </span>
    </div>

    <div class="flex-1 space-y-1.5 overflow-hidden p-2.5">
      <div class="grid grid-cols-3 gap-1.5">
        <HomeMockGauge
          :label="label('rpm')"
          :unit="label('rpmUnit')"
          :base="2450"
          :min="0"
          :max="4000"
          :amplitude="60"
          tone="text-coral-500"
          :icon="Cog8ToothIcon"
        />
        <HomeMockGauge
          :label="label('coolant')"
          unit="°C"
          :base="97"
          :min="40"
          :max="120"
          :amplitude="1.5"
          tone="text-coral-600"
          :icon="FireIcon"
          :delay="STEP"
        />
        <HomeMockGauge
          :label="label('voltage')"
          unit="%"
          :base="19"
          :min="0"
          :max="100"
          :amplitude="0.8"
          tone="text-amber-600"
          :icon="BoltIcon"
          :delay="STEP * 2"
        />
      </div>

      <div class="grid grid-cols-4 gap-1.5">
        <HomeMockStat
          v-for="(stat, index) in stats"
          :key="stat.key"
          :label="label(stat.key)"
          :unit="'unitKey' in stat ? label(stat.unitKey) : stat.unit"
          :base="stat.base"
          :amplitude="stat.amp"
          :icon="stat.icon"
          :chip="stat.chip"
          :delay="STEP * (index + 3)"
        />
      </div>

      <div class="grid grid-cols-2 gap-1.5">
        <HomeMockDial
          variant="compass"
          :label="label('heading')"
          value="212"
          unit="°"
          :angle="212"
          :sway="3"
          :delay="STEP * 7"
        />
        <HomeMockDial
          variant="wind"
          :label="label('apparentWind')"
          value="14"
          :unit="label('windUnit')"
          :angle="48"
          :sway="7"
          :delay="STEP * 8"
        />
      </div>

      <div class="grid grid-cols-3 gap-1.5">
        <HomeMockLevel
          v-for="(level, index) in levels"
          :key="level.key"
          :label="label(level.key)"
          :value="level.value"
          :bar="level.bar"
          :delay="STEP * (9 + index)"
        />
      </div>

      <HomeMockInstrumentsHistory />

      <div class="grid grid-cols-2 gap-1.5">
        <HomeMockAisTargets :delay="STEP * 12" />
        <HomeMockAlerts :delay="STEP * 13" />
      </div>
    </div>
  </div>
</template>
