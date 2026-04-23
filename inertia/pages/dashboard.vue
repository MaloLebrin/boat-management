<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseStatCard from '~/components/base/BaseStatCard.vue'
import { useT } from '~/composables/useT'

const { t } = useT()

type BoatSummary = {
  id: number
  name: string
  propulsionType: string | null
  enginesCount: number
  sailsCount: number
  hasRig: boolean
}

type UrgentMaintenanceRow = {
  id: number
  boatId: number
  boatName: string
  subject: string
  title: string
  kind: 'date' | 'hours'
  dueAt: string | null
  dueEngineHours: number | null
  currentEngineHours: number | null
}

defineProps<{
  boats: BoatSummary[]
  urgentMaintenance: UrgentMaintenanceRow[]
  stats: {
    boats: number
    engines: number
    sails: number
    rigs: number
    urgentMaintenance: number
  }
}>()

function isOverdue(dueAtIso: string) {
  // dueAt is ISO date (YYYY-MM-DD)
  return dueAtIso < new Date().toISOString().slice(0, 10)
}
</script>

<template>
  <Head :title="t('dashboard.title')" />

  <div class="px-8 py-10">
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
      <BaseStatCard :label="t('dashboard.stats.boats')" :value="String(stats.boats)" tone="info" />
      <BaseStatCard :label="t('dashboard.stats.engines')" :value="String(stats.engines)" tone="neutral" />
      <BaseStatCard :label="t('dashboard.stats.sails')" :value="String(stats.sails)" tone="neutral" />
      <BaseStatCard :label="t('dashboard.stats.rigs')" :value="String(stats.rigs)" tone="neutral" />
      <BaseStatCard
        :label="t('dashboard.stats.urgentMaintenance')"
        :value="String(stats.urgentMaintenance)"
        :tone="stats.urgentMaintenance ? 'warning' : 'success'"
      />
    </div>

    <div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <BaseCard class="lg:col-span-1">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-fg">{{ t('dashboard.urgentMaintenance.title') }}</h2>
            <span class="text-xs font-medium text-fg-muted">{{ t('dashboard.urgentMaintenance.period') }}</span>
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
                <p class="mt-1 text-fg-muted">{{ ev.title }} · {{ ev.subject }}</p>
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
                  {{ ev.dueAt && isOverdue(ev.dueAt) ? t('dashboard.urgentMaintenance.overdue') : t('dashboard.urgentMaintenance.dueSoon') }}
                </span>
                <span v-else>{{ t('dashboard.urgentMaintenance.hours') }}</span>
              </div>
            </div>
            <p v-if="ev.kind === 'date'" class="mt-2 text-xs text-fg-subtle">{{ t('dashboard.urgentMaintenance.dueAt', { date: ev.dueAt ?? '' }) }}</p>
            <p v-else class="mt-2 text-xs text-fg-subtle">
              {{ t('dashboard.urgentMaintenance.dueAtHours', { hours: ev.dueEngineHours ?? 0, current: ev.currentEngineHours ?? 0 }) }}
            </p>
          </li>
        </ul>
      </BaseCard>

      <BaseCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-fg">{{ t('dashboard.yourBoats.title') }}</h2>
            <a href="/boats" class="text-sm font-semibold text-brand hover:underline">{{ t('dashboard.yourBoats.viewAll') }}</a>
          </div>
        </template>

        <div class="overflow-hidden rounded-(--radius-control) border border-border">
          <table class="w-full text-left text-sm">
            <thead class="bg-surface-muted text-fg-muted">
              <tr>
                <th class="px-4 py-3 font-semibold">{{ t('dashboard.yourBoats.columns.name') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('dashboard.yourBoats.columns.propulsion') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('dashboard.yourBoats.columns.engines') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('dashboard.yourBoats.columns.sails') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('dashboard.yourBoats.columns.rig') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in boats" :key="b.id" class="border-t border-border">
                <td class="px-4 py-3">
                  <a :href="`/boats/${b.id}`" class="font-semibold text-fg hover:underline">
                    {{ b.name }}
                  </a>
                </td>
                <td class="px-4 py-3 text-fg-muted">{{ b.propulsionType ?? '—' }}</td>
                <td class="px-4 py-3 text-fg-muted">{{ b.enginesCount }}</td>
                <td class="px-4 py-3 text-fg-muted">{{ b.sailsCount }}</td>
                <td class="px-4 py-3 text-fg-muted">{{ b.hasRig ? t('common.yes') : t('common.no') }}</td>
              </tr>
              <tr v-if="boats.length === 0">
                <td class="px-4 py-8 text-center text-fg-muted" colspan="5">{{ t('dashboard.yourBoats.empty') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseCard>
    </div>
  </div>
</template>

