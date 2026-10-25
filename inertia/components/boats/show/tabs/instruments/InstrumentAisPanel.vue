<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import {
  metersToNauticalMiles,
  msToKnots,
  normalizeDegrees,
  radToDegrees,
} from '~/lib/signalk/units'
import { aisRisk, sortAisTargets } from '#shared/helpers/ais'
import type { AisRisk, AisTarget } from '#shared/types/ais'

const InstrumentAisMap = defineAsyncComponent(
  () => import('~/components/boats/show/tabs/instruments/InstrumentAisMap.vue')
)

const props = defineProps<{
  targets: AisTarget[]
  own: { latitude: number; longitude: number } | null
  /** `true` : cibles du flux en direct ; `false` : derniers relevés du serveur. */
  live: boolean
}>()

const { t } = useT()
const { formatTime } = useDateFormat()
const view = ref<'list' | 'map'>('list')

const sorted = computed(() => sortAisTargets(props.targets))

const RISK_VARIANT: Record<AisRisk, 'neutral' | 'warning' | 'danger'> = {
  none: 'neutral',
  watch: 'warning',
  danger: 'danger',
}

function label(target: AisTarget): string {
  return target.name ?? target.mmsi
}

function distance(target: AisTarget): string {
  if (target.distanceM === null) return '—'
  const nm = metersToNauticalMiles(target.distanceM)
  return `${nm.toFixed(nm < 10 ? 2 : 1)} ${t('instruments.ais.nm')}`
}

function speed(target: AisTarget): string {
  if (target.sogMs === null) return '—'
  return `${msToKnots(target.sogMs).toFixed(1)} ${t('instruments.ais.knots')}`
}

function course(target: AisTarget): string {
  if (target.cogRad === null) return '—'
  return `${Math.round(normalizeDegrees(radToDegrees(target.cogRad)))}°`
}

function cpa(target: AisTarget): string {
  if (target.cpaM === null || target.tcpaS === null) return '—'
  if (target.tcpaS < 0) return t('instruments.ais.diverging')
  const nm = metersToNauticalMiles(target.cpaM)
  const minutes = Math.round(target.tcpaS / 60)
  return t('instruments.ais.cpaValue', { cpa: nm.toFixed(2), minutes: String(minutes) })
}

function seen(target: AisTarget): string {
  return formatTime(new Date(target.seenAt))
}
</script>

<template>
  <section data-testid="instrument-ais">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-sm font-semibold uppercase tracking-wide text-fg-muted">
        {{ t('instruments.ais.title') }}
        <span class="ml-1 font-normal normal-case">({{ sorted.length }})</span>
      </h3>
      <div class="flex gap-2">
        <BaseButton
          size="sm"
          :variant="view === 'list' ? 'primary' : 'outline'"
          data-testid="ais-view-list"
          @click="view = 'list'"
        >
          {{ t('instruments.ais.viewList') }}
        </BaseButton>
        <BaseButton
          size="sm"
          :variant="view === 'map' ? 'primary' : 'outline'"
          data-testid="ais-view-map"
          @click="view = 'map'"
        >
          {{ t('instruments.ais.viewMap') }}
        </BaseButton>
      </div>
    </div>
    <p class="mb-3 text-xs text-fg-subtle">
      {{ live ? t('instruments.ais.live') : t('instruments.ais.lastKnown') }}
    </p>

    <p v-if="sorted.length === 0" class="text-sm text-fg-muted" data-testid="ais-empty">
      {{ t('instruments.ais.none') }}
    </p>
    <InstrumentAisMap v-else-if="view === 'map'" :targets="sorted" :own="own" />
    <div v-else class="overflow-x-auto rounded-lg border border-border">
      <table class="w-full text-left text-sm">
        <thead class="bg-surface-muted text-xs uppercase text-fg-muted">
          <tr>
            <th class="px-3 py-2">{{ t('instruments.ais.col.vessel') }}</th>
            <th class="px-3 py-2">{{ t('instruments.ais.col.distance') }}</th>
            <th class="px-3 py-2">{{ t('instruments.ais.col.speed') }}</th>
            <th class="px-3 py-2">{{ t('instruments.ais.col.course') }}</th>
            <th class="px-3 py-2">{{ t('instruments.ais.col.cpa') }}</th>
            <th class="px-3 py-2">{{ t('instruments.ais.col.seen') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="target in sorted"
            :key="target.mmsi"
            class="border-t border-border"
            data-testid="ais-row"
          >
            <td class="px-3 py-2">
              <div class="font-medium text-fg">{{ label(target) }}</div>
              <div class="text-xs text-fg-subtle">
                {{ target.mmsi
                }}<template v-if="target.shipTypeName"> · {{ target.shipTypeName }}</template>
              </div>
            </td>
            <td class="px-3 py-2 text-fg">{{ distance(target) }}</td>
            <td class="px-3 py-2 text-fg">{{ speed(target) }}</td>
            <td class="px-3 py-2 text-fg">{{ course(target) }}</td>
            <td class="px-3 py-2">
              <BaseBadge v-if="aisRisk(target) !== 'none'" :variant="RISK_VARIANT[aisRisk(target)]">
                {{ t(`instruments.ais.risk.${aisRisk(target)}`) }}
              </BaseBadge>
              <span class="ml-1 text-fg">{{ cpa(target) }}</span>
            </td>
            <td class="px-3 py-2 text-xs text-fg-subtle">{{ seen(target) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
