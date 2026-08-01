<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { computed } from 'vue'
import BaseStatCard from '~/components/base/BaseStatCard.vue'
import type { DashboardStats } from '#shared/types/dashboard'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  stats: DashboardStats
}>()

const { t } = useT()

// Aucun équipement saisi sur toute la flotte : plutôt que trois cartes grises
// « Aucune donnée » (Moteurs/Voiles/Gréements), on affiche une seule carte
// combinée avec un CTA « Saisir vos équipements » (#419).
const hasEquipment = computed(
  () => props.stats.engines > 0 || props.stats.sails > 0 || props.stats.rigs > 0
)

type StatTone = 'neutral' | 'empty'

const statTones = computed<Record<'engines' | 'sails' | 'rigs', StatTone>>(() => ({
  engines: props.stats.engines > 0 ? 'neutral' : 'empty',
  sails: props.stats.sails > 0 ? 'neutral' : 'empty',
  rigs: props.stats.rigs > 0 ? 'neutral' : 'empty',
}))

const statDeltas = computed(() => {
  const d = props.stats.deltas
  return {
    boats:
      d.boatsInAlert > 0
        ? t('dashboard.stats.delta.boatsInAlert', { count: String(d.boatsInAlert) })
        : t('dashboard.stats.delta.boatsOk'),
    engines:
      d.boatsWithEngine > 0
        ? t('dashboard.stats.delta.boatsWithEngine', { count: String(d.boatsWithEngine) })
        : t('dashboard.stats.delta.boatsAllMotorless'),
    sails:
      d.boatsWithSail > 0
        ? t('dashboard.stats.delta.boatsWithSail', { count: String(d.boatsWithSail) })
        : t('dashboard.stats.delta.boatsAllSailless'),
    rigs:
      d.boatsWithRig > 0
        ? t('dashboard.stats.delta.boatsWithRig', { count: String(d.boatsWithRig) })
        : t('dashboard.stats.delta.noRig'),
    urgentMaintenance:
      d.overdueCount > 0
        ? t('dashboard.stats.delta.overdue', { count: String(d.overdueCount) })
        : t('dashboard.stats.delta.noOverdue'),
  }
})

function fadeUp(delayMs: number) {
  return {
    animation: 'fadeUp var(--motion-normal) var(--ease-premium) both',
    animationDelay: `${delayMs}ms`,
  }
}
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
    <BaseStatCard
      :label="t('dashboard.stats.boats')"
      :value="String(stats.boats)"
      :delta="statDeltas.boats"
      tone="info"
      href="/boats"
      :style="fadeUp(0)"
    >
      <template #icon>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 17l2-7h14l2 7H3zm9-7V4m0 0L6 9m6-5l6 5M3 17a9 9 0 0018 0"
          />
        </svg>
      </template>
    </BaseStatCard>

    <template v-if="hasEquipment">
      <BaseStatCard
        :label="t('dashboard.stats.engines')"
        :value="String(stats.engines)"
        :delta="statDeltas.engines"
        :tone="statTones.engines"
        href="/boats?hasEngine=true"
        :style="fadeUp(60)"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
            />
          </svg>
        </template>
      </BaseStatCard>
      <BaseStatCard
        :label="t('dashboard.stats.sails')"
        :value="String(stats.sails)"
        :delta="statDeltas.sails"
        :tone="statTones.sails"
        href="/boats?hasSails=true"
        :style="fadeUp(120)"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 3L4 19h8V3zm0 16h8M12 3c2 4 5 9 7 16"
            />
          </svg>
        </template>
      </BaseStatCard>
      <BaseStatCard
        :label="t('dashboard.stats.rigs')"
        :value="String(stats.rigs)"
        :delta="statDeltas.rigs"
        :tone="statTones.rigs"
        href="/boats?hasRig=true"
        :style="fadeUp(180)"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 2v20M6 6l6-4 6 4M8 12h8"
            />
          </svg>
        </template>
      </BaseStatCard>
    </template>

    <div
      v-else
      data-testid="equipment-empty-card"
      class="flex flex-col justify-between rounded-(--radius-card) border border-dashed border-border bg-surface-elevated p-5 shadow-(--shadow-xs) sm:col-span-2 lg:col-span-3"
      :style="fadeUp(60)"
    >
      <div class="flex items-center gap-1.5">
        <span class="shrink-0 text-fg-muted">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 2v3m0 14v3m10-10h-3M5 12H2m15.5-7.5L15 7m-6 10l-2.5 2.5m11 0L15 17M9 7L6.5 4.5"
            />
          </svg>
        </span>
        <p class="text-sm font-semibold text-fg-muted">
          {{ t('dashboard.stats.equipmentEmpty.title') }}
        </p>
      </div>
      <p class="mt-3 text-sm text-fg-subtle">
        {{ t('dashboard.stats.equipmentEmpty.description') }}
      </p>
      <Link
        href="/boats"
        class="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
      >
        {{ t('dashboard.stats.equipmentEmpty.cta') }}
        <span aria-hidden="true">&rarr;</span>
      </Link>
    </div>

    <BaseStatCard
      :label="t('dashboard.stats.urgentMaintenance')"
      :value="String(stats.urgentMaintenance)"
      :delta="statDeltas.urgentMaintenance"
      :tone="stats.urgentMaintenance ? 'warning' : 'success'"
      href="/planning"
      :style="fadeUp(240)"
    >
      <template #icon>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
          />
        </svg>
      </template>
    </BaseStatCard>
  </div>
</template>
