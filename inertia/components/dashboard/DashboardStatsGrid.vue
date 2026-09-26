<script setup lang="ts">
import { computed } from 'vue'
import BaseStatCard from '~/components/base/BaseStatCard.vue'
import type {
  DashboardAttentionCounts,
  DashboardFleetStatus,
  DashboardPulseStats,
  DashboardStats,
} from '#shared/types/dashboard'
import { useT } from '~/composables/use_t'
import { useNumberFormat } from '~/composables/use_number_format'

const props = defineProps<{
  stats: DashboardStats
  pulse: DashboardPulseStats
  fleetStatus: DashboardFleetStatus
  counts: DashboardAttentionCounts
}>()

const { t } = useT()
const { formatNumber } = useNumberFormat()

const days = computed(() => String(props.pulse.windowDays))

// Un badge seulement quand il porte une information (#828) : alerte flotte,
// tâches en retard, incidents ouverts. Le reste s'affiche sans pastille.
const cards = computed(() => [
  {
    key: 'boats',
    label: t('dashboard.stats.boats'),
    value: String(props.stats.boats),
    delta: t('dashboard.stats.delta.atSeaAndAlert', {
      atSea: String(props.fleetStatus.atSea),
      alert: String(props.stats.deltas.boatsInAlert),
    }),
    tone: props.stats.deltas.boatsInAlert > 0 ? ('warning' as const) : ('neutral' as const),
    href: '/boats',
  },
  {
    key: 'trips',
    label: t('dashboard.stats.tripsWindow', { days: days.value }),
    value: String(props.pulse.tripsCompleted),
    delta:
      props.pulse.tripsCompleted > 0
        ? t('dashboard.stats.delta.distance', { nm: formatNumber(props.pulse.distanceNm) })
        : t('dashboard.stats.delta.noTrips'),
    tone: 'neutral' as const,
    href: '/navigation/logbook',
  },
  {
    key: 'tasks',
    label: t('dashboard.stats.tasksDoneWindow', { days: days.value }),
    value: String(props.pulse.tasksDone),
    delta:
      props.stats.deltas.overdueCount > 0
        ? t('dashboard.stats.delta.tasksOverdue', {
            count: String(props.stats.deltas.overdueCount),
          })
        : t('dashboard.stats.delta.tasksUpToDate'),
    tone: props.stats.deltas.overdueCount > 0 ? ('warning' as const) : ('neutral' as const),
    href: '/planning',
  },
  {
    key: 'incidents',
    label: t('dashboard.stats.incidentsOpen'),
    value: String(props.counts.incidentsOpen),
    delta:
      props.counts.incidentsInProgress > 0
        ? t('dashboard.stats.delta.incidentsInProgress', {
            count: String(props.counts.incidentsInProgress),
          })
        : props.counts.incidentsOpen > 0
          ? t('dashboard.stats.delta.incidentsAllOpen')
          : t('dashboard.stats.delta.noIncidents'),
    tone: props.counts.incidentsOpen > 0 ? ('warning' as const) : ('neutral' as const),
    href: '/navigation/incidents',
  },
])

// Entrée en cascade posée en classes (`animate-fade-up` + délai) et non en
// `:style` : la CSP de production ne couvre pas les attributs `style` (#831).
// Liste figée : Tailwind ne génère que les classes présentes dans les sources.
const fadeUpDelayClasses = [
  '',
  '[animation-delay:60ms]',
  '[animation-delay:120ms]',
  '[animation-delay:180ms]',
]
</script>

<template>
  <!-- 4 KPI « pulse » (#832) : bateaux, sorties et tâches sur la fenêtre glissante,
       incidents ouverts. 2 par ligne sous lg, 4 à partir de lg. Les compteurs
       d'équipements restent dans la carte « Vos bateaux ». -->
  <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
    <BaseStatCard
      v-for="(card, index) in cards"
      :key="card.key"
      :data-testid="`dashboard-kpi-${card.key}`"
      :label="card.label"
      :value="card.value"
      :delta="card.delta"
      :tone="card.tone"
      :href="card.href"
      :class="['animate-fade-up', fadeUpDelayClasses[index]]"
    />
  </div>
</template>
