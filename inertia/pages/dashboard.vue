<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseStatCard from '~/components/base/BaseStatCard.vue'

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
  dueAt: string
  performedAt: string
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
  <Head title="Dashboard" />

  <div class="px-8 py-10">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-fg">Dashboard</h1>
        <p class="mt-2 text-base text-fg-muted">Overview of your fleet and upcoming maintenance.</p>
      </div>
      <div class="flex items-center gap-2">
        <a href="/boats">
          <BaseButton variant="secondary">Boats</BaseButton>
        </a>
        <a href="/boats/new">
          <BaseButton variant="primary">New boat</BaseButton>
        </a>
      </div>
    </div>

    <div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <BaseStatCard label="Boats" :value="String(stats.boats)" tone="info" />
      <BaseStatCard label="Engines" :value="String(stats.engines)" tone="neutral" />
      <BaseStatCard label="Sails" :value="String(stats.sails)" tone="neutral" />
      <BaseStatCard label="Rigs" :value="String(stats.rigs)" tone="neutral" />
      <BaseStatCard
        label="Urgent maintenance"
        :value="String(stats.urgentMaintenance)"
        :tone="stats.urgentMaintenance ? 'warning' : 'success'"
      />
    </div>

    <div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <BaseCard class="lg:col-span-1">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-fg">Urgent maintenance</h2>
            <span class="text-xs font-medium text-fg-muted">Next 14 days</span>
          </div>
        </template>

        <div v-if="urgentMaintenance.length === 0" class="text-sm text-fg-muted">
          No urgent maintenance due soon.
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
                  isOverdue(ev.dueAt)
                    ? 'bg-danger/10 text-danger ring-1 ring-danger/20'
                    : 'bg-amber-500/10 text-amber-800 ring-1 ring-amber-500/20'
                "
              >
                {{ isOverdue(ev.dueAt) ? 'Overdue' : 'Due soon' }}
              </div>
            </div>
            <p class="mt-2 text-xs text-fg-subtle">Due {{ ev.dueAt }} · last done {{ ev.performedAt }}</p>
          </li>
        </ul>
      </BaseCard>

      <BaseCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-fg">Your boats</h2>
            <a href="/boats" class="text-sm font-semibold text-brand hover:underline">View all</a>
          </div>
        </template>

        <div class="overflow-hidden rounded-(--radius-control) border border-border">
          <table class="w-full text-left text-sm">
            <thead class="bg-surface-muted text-fg-muted">
              <tr>
                <th class="px-4 py-3 font-semibold">Name</th>
                <th class="px-4 py-3 font-semibold">Propulsion</th>
                <th class="px-4 py-3 font-semibold">Engines</th>
                <th class="px-4 py-3 font-semibold">Sails</th>
                <th class="px-4 py-3 font-semibold">Rig</th>
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
                <td class="px-4 py-3 text-fg-muted">{{ b.hasRig ? 'Yes' : 'No' }}</td>
              </tr>
              <tr v-if="boats.length === 0">
                <td class="px-4 py-8 text-center text-fg-muted" colspan="5">No boats yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseCard>
    </div>
  </div>
</template>

