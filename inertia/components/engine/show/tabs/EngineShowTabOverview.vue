<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/useT'
import type { BoatShowEngine, MaintenanceEventRow, MaintenanceTaskRow } from '~/types/boat_show'

const { t } = useT()

defineProps<{
  engine: BoatShowEngine
  overdueTask: MaintenanceTaskRow | undefined
  recentEvents: MaintenanceEventRow[]
  hoursSinceLastMaint: number | null
  nearestThreshold: number | null
  hoursProgress: number
  isOverThreshold: boolean
  sortedOpenTasks: MaintenanceTaskRow[]
}>()

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-6">
    <div class="flex-1 space-y-6">
      <!-- Overdue alert -->
      <div
        v-if="overdueTask"
        class="border-l-4 border-coral-400 bg-coral-400/10 rounded-r-lg p-4"
      >
        <p class="font-semibold text-coral-700">{{ t('boats.engineShow.overdue.title') }}</p>
        <p class="text-sm text-coral-600 mt-1">
          {{ t('boats.engineShow.overdue.detail', { title: overdueTask.title, hours: String(overdueTask.dueEngineHours) }) }}
        </p>
      </div>

      <!-- KPI row -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BaseCard>
          <p class="text-sm font-semibold text-fg-muted">{{ t('boats.engineShow.overview.totalHours') }}</p>
          <p class="mt-2 font-display text-3xl font-bold tracking-tight text-fg">
            {{ engine.hours ?? '-' }}
          </p>
        </BaseCard>
        <BaseCard>
          <p class="text-sm font-semibold text-fg-muted">{{ t('boats.engineShow.overview.sinceLast') }}</p>
          <p class="mt-2 font-display text-3xl font-bold tracking-tight text-fg">
            {{ hoursSinceLastMaint ?? '-' }}
          </p>
        </BaseCard>
        <BaseCard>
          <p class="text-sm font-semibold text-fg-muted">{{ t('boats.engineShow.overview.costYear') }}</p>
          <p class="mt-2 font-display text-3xl font-bold tracking-tight text-fg">-</p>
        </BaseCard>
      </div>

      <!-- Hours gauge -->
      <BaseCard v-if="engine.hours !== null && nearestThreshold !== null">
        <p class="text-sm font-semibold text-fg mb-3">{{ t('boats.engineShow.overview.gauge') }}</p>
        <div class="h-4 bg-surface-muted rounded-full overflow-hidden">
          <div
            :class="[
              'h-full rounded-full transition-all',
              isOverThreshold ? 'bg-coral-400' : 'bg-lagoon-500',
            ]"
            :style="{ width: `${hoursProgress}%` }"
          />
        </div>
        <div class="flex justify-between mt-2 text-sm text-fg-muted">
          <span>{{ engine.hours }} h</span>
          <span>{{ nearestThreshold }} h</span>
        </div>
      </BaseCard>

      <!-- Recent maintenance -->
      <BaseCard>
        <p class="text-sm font-semibold text-fg mb-4">{{ t('boats.engineShow.overview.recentMaintenance') }}</p>
        <div v-if="recentEvents.length === 0" class="text-sm text-fg-muted">
          {{ t('boats.engineShow.overview.noEvent') }}
        </div>
        <ul v-else class="space-y-3">
          <li
            v-for="event in recentEvents"
            :key="event.id"
            class="flex items-center justify-between text-sm"
          >
            <span class="font-medium text-fg">{{ event.title }}</span>
            <span class="text-fg-muted">{{ formatDate(event.performedAt) }}</span>
          </li>
        </ul>
      </BaseCard>
    </div>

    <!-- Right rail -->
    <div class="w-full lg:w-72 space-y-6">
      <!-- AI Panel -->
      <div class="bg-abyss-900 text-white rounded-xl p-4">
        <p class="font-semibold flex items-center gap-2">
          <span class="text-brand">&#10022;</span> {{ t('boats.engineShow.overview.aiTitle') }}
        </p>
        <div class="mt-4 space-y-2">
          <div class="bg-white/10 rounded-lg px-3 py-2 text-sm">
            {{ t('boats.engineShow.overview.aiPrompt1') }}
          </div>
          <div class="bg-white/10 rounded-lg px-3 py-2 text-sm">
            {{ t('boats.engineShow.overview.aiPrompt2') }}
          </div>
        </div>
      </div>

      <!-- Prochaines echeances -->
      <BaseCard>
        <p class="text-sm font-semibold text-fg mb-4">{{ t('boats.engineShow.overview.nextDue') }}</p>
        <div v-if="sortedOpenTasks.length === 0" class="text-sm text-fg-muted">
          {{ t('boats.engineShow.overview.noTaskPlanned') }}
        </div>
        <ul v-else class="space-y-3">
          <li v-for="task in sortedOpenTasks.slice(0, 5)" :key="task.id" class="text-sm">
            <p class="font-medium text-fg">{{ task.title }}</p>
            <p class="text-fg-muted">
              <span v-if="task.dueAt">{{ formatDate(task.dueAt) }}</span>
              <span v-else-if="task.dueEngineHours">{{ task.dueEngineHours }} h</span>
            </p>
          </li>
        </ul>
      </BaseCard>
    </div>
  </div>
</template>
