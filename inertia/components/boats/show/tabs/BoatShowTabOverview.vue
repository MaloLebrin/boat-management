<script setup lang="ts">
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { computed } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { subjectLabel } from '~/components/boats/maintenance/utils'
import BoatPhotoGallery from '~/components/boats/show/BoatPhotoGallery.vue'
import { useT } from '~/composables/useT'
import type { BoatShowDetail, MaintenanceEventRow, MaintenanceTaskRow } from '~/types/boat_show'

const { t } = useT()

const props = defineProps<{
  boat: BoatShowDetail
  maintenanceTasks: MaintenanceTaskRow[]
  maintenanceEvents: MaintenanceEventRow[]
  canManage: boolean
}>()

const emit = defineEmits<{
  'go-to-tab': [tab: string]
}>()

const todayIso = computed(() => new Date().toISOString().slice(0, 10))

const openTasks = computed(() => props.maintenanceTasks.filter((t) => t.status === 'open'))

const overdueTasks = computed(() =>
  openTasks.value.filter((t) => t.dueAt && String(t.dueAt) <= todayIso.value)
)

const totalEngineHours = computed(() => {
  const enginesWithHours = props.boat.engines.filter((e) => e.hours !== null)
  if (enginesWithHours.length === 0) return null
  return enginesWithHours.reduce((sum, e) => sum + (e.hours ?? 0), 0)
})

const lastMaintenanceDate = computed(() => {
  if (props.maintenanceEvents.length === 0) return null
  const sorted = [...props.maintenanceEvents].sort((a, b) =>
    String(b.performedAt).localeCompare(String(a.performedAt))
  )
  return sorted[0]?.performedAt ?? null
})

const nextTaskDueDate = computed(() => {
  const tasksWithDueAt = openTasks.value.filter((t) => t.dueAt)
  if (tasksWithDueAt.length === 0) return null
  tasksWithDueAt.sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)))
  return tasksWithDueAt[0]?.dueAt ?? null
})

const recentEvents = computed(() => {
  const sorted = [...props.maintenanceEvents].sort((a, b) =>
    String(b.performedAt).localeCompare(String(a.performedAt))
  )
  return sorted.slice(0, 5)
})

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-6">
    <!-- Left column -->
    <div class="flex-1 space-y-6">
      <!-- Photo gallery -->
      <BoatPhotoGallery :boat="boat" :can-manage="canManage" />

      <!-- Overdue alert -->
      <div v-if="overdueTasks.length > 0" class="rounded-lg border border-coral-300 bg-coral-50 p-4">
        <div class="flex items-start gap-3">
          <ExclamationTriangleIcon class="h-5 w-5 text-coral-600 shrink-0 mt-0.5" />
          <div class="flex-1">
            <p class="font-semibold text-coral-900">{{ t('boats.show.overview.overdueTasks', { count: String(overdueTasks.length) }) }}</p>
            <ul class="mt-2 space-y-1 text-sm text-coral-800">
              <li v-for="task in overdueTasks.slice(0, 3)" :key="task.id">
                {{ task.title }} - {{ formatDate(task.dueAt) }}
              </li>
            </ul>
            <BaseButton variant="secondary" size="sm" class="mt-3" @click="emit('go-to-tab', 'tasks')">
              {{ t('boats.show.overview.schedule') }}
            </BaseButton>
          </div>
        </div>
      </div>

      <!-- KPI row -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BaseCard padded>
          <div class="text-center">
            <p class="text-2xl font-bold text-fg">{{ totalEngineHours ?? '—' }}</p>
            <p class="text-sm text-fg-muted">{{ t('boats.show.overview.engineHours') }}</p>
            <p class="text-xs text-fg-subtle">{{ t('boats.show.overview.engineCount', { count: String(boat.engines.length) }) }}</p>
          </div>
        </BaseCard>
        <BaseCard padded>
          <div class="text-center">
            <p class="text-2xl font-bold text-fg">{{ formatDate(lastMaintenanceDate) }}</p>
            <p class="text-sm text-fg-muted">{{ t('boats.show.overview.lastMaintenance') }}</p>
          </div>
        </BaseCard>
        <BaseCard padded>
          <div class="text-center">
            <p class="text-2xl font-bold text-fg">{{ formatDate(nextTaskDueDate) }}</p>
            <p class="text-sm text-fg-muted">{{ t('boats.show.overview.nextTask') }}</p>
            <BaseBadge v-if="nextTaskDueDate && nextTaskDueDate <= todayIso" variant="warning" class="mt-1">
              {{ t('boats.show.overview.overdue') }}
            </BaseBadge>
          </div>
        </BaseCard>
      </div>

      <!-- Specs summary card -->
      <BaseCard padded>
        <template #header>
          <p class="text-sm font-semibold text-fg">{{ t('boats.show.overview.dimensionsTitle') }}</p>
        </template>
        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-fg-muted">{{ t('boats.show.overview.length') }}</dt>
            <dd class="font-semibold text-fg">{{ boat.lengthM ? `${boat.lengthM} m` : '—' }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">{{ t('boats.show.overview.beam') }}</dt>
            <dd class="font-semibold text-fg">{{ boat.beamM ? `${boat.beamM} m` : '—' }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">{{ t('boats.show.overview.draft') }}</dt>
            <dd class="font-semibold text-fg">{{ boat.draftM ? `${boat.draftM} m` : '—' }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">{{ t('boats.show.overview.mastHeight') }}</dt>
            <dd class="font-semibold text-fg">{{ boat.mastHeightM ? `${boat.mastHeightM} m` : '—' }}</dd>
          </div>
        </dl>
        <div class="mt-4">
          <button type="button" class="text-sm font-semibold text-brand hover:underline"
            @click="emit('go-to-tab', 'specs')">
            {{ t('boats.show.overview.viewSpecs') }}
          </button>
        </div>
      </BaseCard>

      <!-- Recent activity card -->
      <BaseCard padded>
        <template #header>
          <p class="text-sm font-semibold text-fg">{{ t('boats.show.overview.recentActivityTitle') }}</p>
        </template>
        <div v-if="recentEvents.length === 0" class="text-sm text-fg-muted">
          {{ t('boats.show.overview.recentActivityEmpty') }}
        </div>
        <ul v-else class="space-y-3 text-sm">
          <li v-for="ev in recentEvents" :key="ev.id" class="flex items-start justify-between gap-3">
            <div>
              <p class="font-semibold text-fg">{{ ev.title }}</p>
              <p class="text-fg-muted">{{ subjectLabel(ev.subject) }}</p>
            </div>
            <span class="text-fg-subtle shrink-0">{{ formatDate(ev.performedAt) }}</span>
          </li>
        </ul>
        <div class="mt-4">
          <button type="button" class="text-sm font-semibold text-brand hover:underline"
            @click="emit('go-to-tab', 'history')">
            {{ t('boats.show.overview.viewHistory') }}
          </button>
        </div>
      </BaseCard>
    </div>

    <!-- Right column (w-72) -->
    <div class="w-full lg:w-72 space-y-6">
      <!-- TODO: replace hardcoded AI suggestions with real Mistral suggestions from backend -->
      <!-- TODO: wire each suggestion button to open a chat/prompt flow -->
      <!-- AI panel -->
      <div class="bg-abyss-900 text-white rounded-xl p-4">
        <p class="font-semibold flex items-center gap-2">
          <span class="text-lg">&#10022;</span>
          {{ t('boats.show.overview.aiTitle') }}
        </p>
        <div class="mt-3 space-y-2">
          <div class="rounded-lg bg-abyss-800 px-3 py-2 text-sm">
            {{ t('boats.show.overview.aiSuggestion0') }}
          </div>
          <div class="rounded-lg bg-abyss-800 px-3 py-2 text-sm">
            {{ t('boats.show.overview.aiSuggestion1') }}
          </div>
        </div>
      </div>

      <!-- TODO: add a `homePort` field to the Boat model/migration/form and display it here instead of registrationNumber -->
      <!-- Location placeholder -->
      <BaseCard padded>
        <p class="text-sm font-semibold text-fg">{{ t('boats.show.overview.homePortTitle') }}</p>
        <p class="mt-2 text-sm text-fg-muted">
          {{ boat.homePort ?? t('boats.show.overview.homePortEmpty') }}
        </p>
      </BaseCard>
    </div>
  </div>
</template>
