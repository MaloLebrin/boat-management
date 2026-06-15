<script setup lang="ts">
import { Head, router, usePage } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseSkeleton from '~/components/base/BaseSkeleton.vue'
import BaseStatCard from '~/components/base/BaseStatCard.vue'
import MarinaDashboardCard from '~/components/dashboard/MarinaDashboardCard.vue'
import UpgradePlanModal from '~/components/base/UpgradePlanModal.vue'
import type {
  DashboardBoatSummary,
  DashboardPortItem,
  DashboardPortStats,
  DashboardStats,
  DashboardUrgentMaintenanceRow,
} from '#shared/types/dashboard'
import { useT } from '~/composables/use_t'
import type { AiSuggestion } from '~/types/boat_show'
import { PLAN_LIMITS } from '../../shared/types/plan'
import type { PlanTier } from '../../shared/types/plan'

const { t } = useT()
const page = usePage()

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

const props = defineProps<{
  boats: DashboardBoatSummary[]
  urgentMaintenance: DashboardUrgentMaintenanceRow[]
  stats: DashboardStats
  aiFleetAnalysis: AiSuggestion[] | null
  ports: DashboardPortItem[]
  portStats: DashboardPortStats
}>()

const canUseAI = computed(() => {
  const plan = (page.props.currentPlan as PlanTier | undefined) ?? 'starter'
  return PLAN_LIMITS[plan].canUseAI
})

const showAlert = ref(true)
const isAnalyzing = ref(false)
const showUpgradeModal = ref(false)

function analyzeFleet() {
  if (!canUseAI.value) {
    showUpgradeModal.value = true
    return
  }
  isAnalyzing.value = true
  router.post(
    '/ai/fleet-analysis',
    {},
    {
      preserveScroll: true,
      onFinish: () => {
        isAnalyzing.value = false
      },
    }
  )
}

function isOverdue(dueAtIso: string) {
  return dueAtIso < new Date().toISOString().slice(0, 10)
}

function dismissAlert() {
  showAlert.value = false
}
</script>

<template>
  <Head :title="t('dashboard.title')" />

  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <BaseAlert
      v-if="stats.urgentMaintenance > 0 && showAlert"
      variant="warning"
      styled="bordered"
      dismissible
      class="mb-6"
      @dismiss="dismissAlert"
    >
      <span class="font-semibold">{{
        t('dashboard.overdueAlert', { count: String(stats.urgentMaintenance) })
      }}</span>
      <span class="mx-2">-</span>
      <a href="/planning" class="underline hover:no-underline">{{ t('dashboard.viewPlanning') }}</a>
    </BaseAlert>

    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-fg">{{ t('dashboard.title') }}</h1>
        <p class="mt-2 text-base text-fg-muted">{{ t('dashboard.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <a href="/boats">
          <BaseButton variant="secondary">{{ t('nav.boats') }}</BaseButton>
        </a>
        <a href="/boats/new">
          <BaseButton variant="primary">{{ t('dashboard.newBoat') }}</BaseButton>
        </a>
      </div>
    </div>

    <div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <BaseStatCard
        :label="t('dashboard.stats.boats')"
        :value="String(stats.boats)"
        :delta="statDeltas.boats"
        tone="info"
        href="/boats"
        :style="{
          animation: 'fadeUp var(--motion-normal) var(--ease-premium) both',
          animationDelay: '0ms',
        }"
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
      <BaseStatCard
        :label="t('dashboard.stats.engines')"
        :value="String(stats.engines)"
        :delta="statDeltas.engines"
        tone="neutral"
        href="/boats"
        :style="{
          animation: 'fadeUp var(--motion-normal) var(--ease-premium) both',
          animationDelay: '60ms',
        }"
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
        tone="neutral"
        href="/boats"
        :style="{
          animation: 'fadeUp var(--motion-normal) var(--ease-premium) both',
          animationDelay: '120ms',
        }"
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
        tone="neutral"
        href="/boats"
        :style="{
          animation: 'fadeUp var(--motion-normal) var(--ease-premium) both',
          animationDelay: '180ms',
        }"
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
      <BaseStatCard
        :label="t('dashboard.stats.urgentMaintenance')"
        :value="String(stats.urgentMaintenance)"
        :delta="statDeltas.urgentMaintenance"
        :tone="stats.urgentMaintenance ? 'warning' : 'success'"
        href="/planning"
        :style="{
          animation: 'fadeUp var(--motion-normal) var(--ease-premium) both',
          animationDelay: '240ms',
        }"
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

    <div class="mt-8">
      <MarinaDashboardCard :ports="ports" :port-stats="portStats" />
    </div>

    <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_16rem]">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
        <BaseCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-fg">
                {{ t('dashboard.urgentMaintenance.title') }}
              </h2>
              <span class="text-xs font-medium text-fg-muted">{{
                t('dashboard.urgentMaintenance.period')
              }}</span>
            </div>
          </template>

          <div v-if="urgentMaintenance.length === 0" class="text-sm text-fg-muted">
            {{ t('dashboard.urgentMaintenance.empty') }}
          </div>

          <ul v-else class="space-y-3 text-sm">
            <li
              v-for="ev in urgentMaintenance"
              :key="ev.id"
              class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-3"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <a :href="`/boats/${ev.boatId}`" class="font-semibold text-fg hover:underline">
                    {{ ev.boatName }}
                  </a>
                  <p class="mt-1 text-fg-muted">{{ ev.title }} - {{ ev.subject }}</p>
                </div>
                <div
                  class="shrink-0 rounded-full px-2 py-1 text-xs font-semibold"
                  :class="
                    ev.kind === 'date' && ev.dueAt && isOverdue(ev.dueAt)
                      ? 'bg-danger/10 text-danger ring-1 ring-danger/20'
                      : ev.kind === 'date'
                        ? 'bg-amber-500/10 text-amber-800 ring-1 ring-amber-500/20'
                        : 'bg-sky-500/10 text-sky-800 ring-1 ring-sky-500/20'
                  "
                >
                  <span v-if="ev.kind === 'date'">
                    {{
                      ev.dueAt && isOverdue(ev.dueAt)
                        ? t('dashboard.urgentMaintenance.overdue')
                        : t('dashboard.urgentMaintenance.dueSoon')
                    }}
                  </span>
                  <span v-else>{{ t('dashboard.urgentMaintenance.hours') }}</span>
                </div>
              </div>
              <p v-if="ev.kind === 'date'" class="mt-2 text-xs text-fg-subtle">
                {{ t('dashboard.urgentMaintenance.dueAt', { date: ev.dueAt ?? '' }) }}
              </p>
              <p v-else class="mt-2 text-xs text-fg-subtle">
                {{
                  t('dashboard.urgentMaintenance.dueAtHours', {
                    hours: ev.dueEngineHours ?? 0,
                    current: ev.currentEngineHours ?? 0,
                  })
                }}
              </p>
            </li>
          </ul>
        </BaseCard>

        <BaseCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-fg">{{ t('dashboard.yourBoats.title') }}</h2>
              <a href="/boats" class="text-sm font-semibold text-brand hover:underline">{{
                t('dashboard.yourBoats.viewAll')
              }}</a>
            </div>
          </template>

          <div class="overflow-x-auto rounded-(--radius-control) border border-border">
            <table class="w-full min-w-[520px] text-left text-sm">
              <thead class="bg-surface-muted text-fg-muted">
                <tr>
                  <th class="px-4 py-3 font-semibold">
                    {{ t('dashboard.yourBoats.columns.name') }}
                  </th>
                  <th class="px-4 py-3 font-semibold">
                    {{ t('dashboard.yourBoats.columns.propulsion') }}
                  </th>
                  <th class="px-4 py-3 font-semibold">
                    {{ t('dashboard.yourBoats.columns.engines') }}
                  </th>
                  <th class="px-4 py-3 font-semibold">
                    {{ t('dashboard.yourBoats.columns.sails') }}
                  </th>
                  <th class="px-4 py-3 font-semibold">
                    {{ t('dashboard.yourBoats.columns.rig') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="b in boats" :key="b.id" class="border-t border-border">
                  <td class="px-4 py-3">
                    <a :href="`/boats/${b.id}`" class="font-semibold text-fg hover:underline">
                      {{ b.name }}
                    </a>
                  </td>
                  <td class="px-4 py-3 text-fg-muted">{{ b.propulsionType ?? '-' }}</td>
                  <td class="px-4 py-3 text-fg-muted">{{ b.enginesCount }}</td>
                  <td class="px-4 py-3 text-fg-muted">{{ b.sailsCount }}</td>
                  <td class="px-4 py-3 text-fg-muted">
                    {{ b.hasRig ? t('common.yes') : t('common.no') }}
                  </td>
                </tr>
                <tr v-if="boats.length === 0">
                  <td class="px-4 py-8 text-center text-fg-muted" colspan="5">
                    {{ t('dashboard.yourBoats.empty') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </BaseCard>
      </div>

      <div class="bg-surface-inverse text-fg-inverse rounded-xl p-5">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-info">&#10022;</span>
          <h3 class="text-base font-semibold">{{ t('dashboard.aiPanel.title') }}</h3>
        </div>
        <p class="text-xs text-fg-inverse/70 mb-4">{{ t('dashboard.aiPanel.suggestions') }}</p>

        <div v-if="isAnalyzing" class="space-y-3 mb-5">
          <BaseSkeleton height-class="h-14" rounded-class="rounded-lg" class="opacity-30" />
          <BaseSkeleton height-class="h-14" rounded-class="rounded-lg" class="opacity-20" />
          <BaseSkeleton height-class="h-10" rounded-class="rounded-lg" class="opacity-10" />
        </div>
        <div v-else-if="!aiFleetAnalysis" class="mb-5">
          <p class="text-sm text-fg-inverse/60">{{ t('dashboard.aiPanel.empty') }}</p>
        </div>
        <div v-else-if="aiFleetAnalysis.length === 0" class="mb-5">
          <p class="text-sm text-fg-inverse/60">{{ t('dashboard.aiPanel.noSuggestions') }}</p>
        </div>
        <div v-else class="space-y-3 mb-5">
          <div
            v-for="(s, i) in aiFleetAnalysis"
            :key="i"
            class="bg-brand/60 rounded-lg p-3 border border-brand"
          >
            <p class="text-sm text-fg-inverse">{{ s.text }}</p>
          </div>
        </div>

        <BaseButton :disabled="isAnalyzing" class="w-full" @click="analyzeFleet">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <span>{{
            isAnalyzing ? t('dashboard.aiPanel.analyzing') : t('dashboard.analyzeFleet')
          }}</span>
        </BaseButton>
      </div>
    </div>
  </div>

  <UpgradePlanModal v-model:open="showUpgradeModal" feature="ai" />
</template>
