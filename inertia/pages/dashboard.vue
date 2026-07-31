<script setup lang="ts">
import { Head, router, usePage } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseSkeleton from '~/components/base/BaseSkeleton.vue'
import DashboardStatsGrid from '~/components/dashboard/DashboardStatsGrid.vue'
import PortDashboardCard from '~/components/dashboard/PortDashboardCard.vue'
import UpgradePlanModal from '~/components/base/UpgradePlanModal.vue'
import NewBoatButton from '~/components/boats/NewBoatButton.vue'
import DashboardQuickAddActions from '~/components/dashboard/DashboardQuickAddActions.vue'
import type {
  DashboardBoatSummary,
  DashboardPortItem,
  DashboardPortStats,
  DashboardStats,
  DashboardUrgentMaintenanceRow,
} from '#shared/types/dashboard'
import { useT } from '~/composables/use_t'
import { useDateFormat } from '~/composables/use_date_format'
import { propulsionLabel } from '~/utils/boat_propulsion_label'
import { maintenanceSubjectLabel } from '~/utils/boat_enum_labels'
import type { AiSuggestion, NavigationLogPortOption } from '~/types/boat_show'
import { PLAN_LIMITS } from '../../shared/types/plan'
import type { PlanTier, QuotaUsage } from '../../shared/types/plan'

const { t } = useT()
const { formatDate } = useDateFormat()
const page = usePage()

const props = defineProps<{
  boats: DashboardBoatSummary[]
  urgentMaintenance: DashboardUrgentMaintenanceRow[]
  stats: DashboardStats
  aiFleetAnalysis: AiSuggestion[] | null
  ports: DashboardPortItem[]
  portStats: DashboardPortStats
  portOptions: NavigationLogPortOption[]
  canCreateNavigationLogs: boolean
  canCreateIncidents: boolean
  canAddBoat: boolean
  boatQuota: QuotaUsage['boats']
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
      <span class="flex flex-wrap items-center gap-2">
        <span class="font-semibold">{{
          t('dashboard.overdueAlert', { count: String(stats.urgentMaintenance) })
        }}</span>
        <span>-</span>
        <a href="/planning" class="underline hover:no-underline">{{
          t('dashboard.viewPlanning')
        }}</a>
      </span>
    </BaseAlert>

    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-fg">{{ t('dashboard.title') }}</h1>
        <p class="mt-2 text-base text-fg-muted">{{ t('dashboard.subtitle') }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <DashboardQuickAddActions
          :boats="boats"
          :port-options="portOptions"
          :can-create-navigation-logs="canCreateNavigationLogs"
          :can-create-incidents="canCreateIncidents"
        />
        <!-- Navigation (pas une action) : rendu « lien » ghost pour se distinguer
             des chips d'action « + Entrée journal » / « + Incident » (#419). -->
        <BaseButton variant="ghost" route="boats.index">
          <span>{{ t('nav.boats') }}</span>
          <span aria-hidden="true">&rarr;</span>
        </BaseButton>
        <NewBoatButton :can-add-boat="canAddBoat" :quota="boatQuota" />
      </div>
    </div>

    <DashboardStatsGrid class="mt-8" :stats="stats" />

    <div class="mt-8">
      <PortDashboardCard :ports="ports" :port-stats="portStats" />
    </div>

    <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <BaseCard>
          <template #header>
            <div class="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
              <h2 class="text-sm font-semibold text-fg">
                {{ t('dashboard.urgentMaintenance.title') }}
              </h2>
              <span class="shrink-0 text-xs font-medium whitespace-nowrap text-fg-muted">{{
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
                  <p class="mt-1 text-fg-muted">
                    {{ ev.title }} - {{ maintenanceSubjectLabel(t, ev.subject) }}
                  </p>
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
                {{ t('dashboard.urgentMaintenance.dueAt', { date: formatDate(ev.dueAt) }) }}
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
                  <td class="px-4 py-3 text-fg-muted">
                    {{ propulsionLabel(t, b.propulsionType) ?? '-' }}
                  </td>
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
