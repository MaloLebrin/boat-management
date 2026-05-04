<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { router } from '@inertiajs/vue3'

interface PlanningTask {
  id: number
  boatId: number
  boatName: string
  title: string
  subject: string
  kind: 'date' | 'hours'
  dueAt: string | null
  dueEngineHours: number | null
  currentEngineHours: number | null
  status: 'open' | 'done'
}

const props = defineProps<{
  tasks: PlanningTask[]
  overdueTasks: PlanningTask[]
  soonTasks: PlanningTask[]
  plannedTasks: PlanningTask[]
}>()

type ViewMode = 'kanban' | 'calendar'
const viewMode = ref<ViewMode>('kanban')

const today = new Date()
const currentYear = today.getFullYear()
const currentMonth = today.getMonth()

// TODO: add month navigation — make currentYear/currentMonth reactive refs and add prev/next buttons
// TODO: load done tasks from backend and show them in the "Complétées" kanban column

const monthLabel = computed(() =>
  new Date(currentYear, currentMonth).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
)

const daysInMonth = computed(() => new Date(currentYear, currentMonth + 1, 0).getDate())
const firstWeekday = computed(() => {
  const d = new Date(currentYear, currentMonth, 1).getDay()
  return d === 0 ? 6 : d - 1
})

const calendarDays = computed(() => {
  const days: Array<{ day: number; tasks: PlanningTask[] }> = []
  for (let d = 1; d <= daysInMonth.value; d++) {
    const iso = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      day: d,
      tasks: props.tasks.filter((t) => t.dueAt === iso),
    })
  }
  return days
})

const tasksWithoutDate = computed(() => props.tasks.filter((t) => !t.dueAt && t.kind === 'date'))

function formatDue(task: PlanningTask): string {
  if (task.kind === 'date' && task.dueAt) return task.dueAt
  if (task.kind === 'hours' && task.dueEngineHours !== null) return `${task.dueEngineHours}h`
  return '—'
}

function taskPillClass(task: PlanningTask): string {
  const dueDate = task.dueAt
  if (!dueDate) return 'bg-abyss-700 text-white'
  const todayIso = today.toISOString().slice(0, 10)
  if (dueDate < todayIso) return 'bg-red-500 text-white'
  const soon = new Date(today)
  soon.setDate(soon.getDate() + 30)
  if (new Date(dueDate) <= soon) return 'bg-amber-500 text-white'
  return 'bg-lagoon-600 text-white'
}
</script>

<template>
  <div class="flex min-h-full flex-col px-6 py-8 sm:px-8">
    <!-- Page header -->
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <BaseHeading level="1">Planning de maintenance</BaseHeading>
        <p class="mt-1 text-sm text-fg-muted">Vue d'ensemble des tâches pour tous vos bateaux</p>
      </div>

      <!-- View toggle -->
      <div class="flex items-center gap-1 rounded-lg border border-border bg-surface-muted p-1">
        <button
          type="button"
          :class="[
            'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            viewMode === 'kanban' ? 'bg-surface-elevated text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
          ]"
          @click="viewMode = 'kanban'"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          Kanban
        </button>
        <button
          type="button"
          :class="[
            'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            viewMode === 'calendar' ? 'bg-surface-elevated text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
          ]"
          @click="viewMode = 'calendar'"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Calendrier
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="tasks.length === 0">
      <BaseEmptyState
        title="Aucune tâche de maintenance"
        description="Créez des tâches de maintenance depuis la fiche d'un bateau."
        action-label="Voir mes bateaux"
        @action="router.visit('/boats')"
      />
    </div>

    <!-- ===== KANBAN VIEW ===== -->
    <div v-else-if="viewMode === 'kanban'" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <!-- En retard -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2 rounded-lg border-l-4 border-red-500 bg-red-50 px-3 py-2">
          <h2 class="text-sm font-semibold text-red-700">En retard</h2>
          <span class="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
            {{ overdueTasks.length }}
          </span>
        </div>
        <div v-if="overdueTasks.length === 0" class="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted">
          Aucune tâche en retard
        </div>
        <BaseCard v-for="task in overdueTasks" :key="task.id" class="border-l-4 border-red-400">
          <p class="text-xs font-medium text-fg-muted">{{ task.boatName }}</p>
          <p class="mt-1 text-sm font-semibold text-fg">{{ task.title }}</p>
          <p class="mt-1 text-xs text-fg-muted capitalize">{{ task.subject }}</p>
          <div class="mt-2 flex items-center justify-between">
            <span class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {{ formatDue(task) }}
            </span>
            <span class="text-xs text-fg-subtle">{{ task.kind === 'date' ? 'date' : 'heures' }}</span>
          </div>
        </BaseCard>
      </div>

      <!-- À venir bientôt -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-2">
          <h2 class="text-sm font-semibold text-amber-700">À venir bientôt</h2>
          <span class="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-xs font-semibold text-white">
            {{ soonTasks.length }}
          </span>
        </div>
        <div v-if="soonTasks.length === 0" class="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted">
          Aucune tâche imminente
        </div>
        <BaseCard v-for="task in soonTasks" :key="task.id" class="border-l-4 border-amber-300">
          <p class="text-xs font-medium text-fg-muted">{{ task.boatName }}</p>
          <p class="mt-1 text-sm font-semibold text-fg">{{ task.title }}</p>
          <p class="mt-1 text-xs text-fg-muted capitalize">{{ task.subject }}</p>
          <div class="mt-2 flex items-center justify-between">
            <span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {{ formatDue(task) }}
            </span>
            <span class="text-xs text-fg-subtle">{{ task.kind === 'date' ? 'date' : 'heures' }}</span>
          </div>
        </BaseCard>
      </div>

      <!-- Planifiées -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2 rounded-lg border-l-4 border-abyss-700 bg-abyss-50 px-3 py-2">
          <h2 class="text-sm font-semibold text-abyss-700">Planifiées</h2>
          <span class="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-abyss-700 px-1.5 text-xs font-semibold text-white">
            {{ plannedTasks.length }}
          </span>
        </div>
        <div v-if="plannedTasks.length === 0" class="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted">
          Aucune tâche planifiée
        </div>
        <BaseCard v-for="task in plannedTasks" :key="task.id">
          <p class="text-xs font-medium text-fg-muted">{{ task.boatName }}</p>
          <p class="mt-1 text-sm font-semibold text-fg">{{ task.title }}</p>
          <p class="mt-1 text-xs text-fg-muted capitalize">{{ task.subject }}</p>
          <div class="mt-2 flex items-center justify-between">
            <span class="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-fg-muted">
              {{ formatDue(task) }}
            </span>
            <span class="text-xs text-fg-subtle">{{ task.kind === 'date' ? 'date' : 'heures' }}</span>
          </div>
        </BaseCard>
      </div>

      <!-- TODO: fetch done tasks from backend (planning controller) and render them here instead of the static empty state -->
      <!-- Complétées -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2 rounded-lg border-l-4 border-mint-600 bg-mint-50 px-3 py-2">
          <h2 class="text-sm font-semibold text-mint-700">Complétées</h2>
          <span class="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-mint-600 px-1.5 text-xs font-semibold text-white">0</span>
        </div>
        <div class="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted">
          Les tâches complétées apparaissent ici
        </div>
      </div>
    </div>

    <!-- ===== CALENDAR VIEW ===== -->
    <div v-else class="space-y-6">
      <BaseCard>
        <template #header>
          <!-- TODO: add prev/next month navigation buttons — currentYear and currentMonth must become reactive refs -->
          <h2 class="text-sm font-semibold capitalize text-fg">{{ monthLabel }}</h2>
        </template>

        <!-- Day-of-week header -->
        <div class="mb-1 grid grid-cols-7 text-center">
          <div
            v-for="day in ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']"
            :key="day"
            class="py-1 text-xs font-semibold text-fg-muted"
          >
            {{ day }}
          </div>
        </div>

        <!-- Calendar grid -->
        <div class="grid grid-cols-7 gap-px rounded-lg overflow-hidden border border-border">
          <!-- Empty cells for offset -->
          <div
            v-for="n in firstWeekday"
            :key="`empty-${n}`"
            class="min-h-20 bg-surface-muted/40 p-1"
          />
          <!-- Day cells -->
          <div
            v-for="cell in calendarDays"
            :key="cell.day"
            class="min-h-20 bg-surface-elevated p-1.5"
            :class="cell.day === today.getDate() ? 'ring-2 ring-inset ring-lagoon-500' : ''"
          >
            <span
              class="mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
              :class="cell.day === today.getDate() ? 'bg-lagoon-500 text-white' : 'text-fg-muted'"
            >
              {{ cell.day }}
            </span>
            <div class="space-y-0.5">
              <div
                v-for="task in cell.tasks.slice(0, 3)"
                :key="task.id"
                :class="['truncate rounded px-1 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80', taskPillClass(task)]"
                :title="task.boatName + ' · ' + task.title"
                @click="router.visit(`/boats/${task.boatId}`)"
              >
                {{ task.title }}
              </div>
              <div
                v-if="cell.tasks.length > 3"
                class="rounded bg-surface-muted px-1 py-0.5 text-xs text-fg-muted"
              >
                +{{ cell.tasks.length - 3 }} autres
              </div>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Tasks without date -->
      <BaseCard v-if="tasksWithoutDate.length > 0">
        <template #header>
          <h2 class="text-sm font-semibold text-fg">Sans date planifiée</h2>
        </template>
        <div class="space-y-2">
          <div
            v-for="task in tasksWithoutDate"
            :key="task.id"
            class="flex items-center justify-between rounded-lg border border-border px-3 py-2"
          >
            <div>
              <p class="text-sm font-medium text-fg">{{ task.title }}</p>
              <p class="text-xs text-fg-muted">{{ task.boatName }} · {{ task.subject }}</p>
            </div>
            <!-- TODO: replace href with a link to the task edit page or open an inline modal to set the dueAt date -->
            <a :href="`/boats/${task.boatId}`" class="text-xs font-medium text-brand hover:underline">
              Planifier
            </a>
          </div>
        </div>
      </BaseCard>

      <!-- Tasks triggered by hours -->
      <BaseCard v-if="tasks.filter(t => t.kind === 'hours').length > 0">
        <template #header>
          <h2 class="text-sm font-semibold text-fg">Déclenchées par les heures moteur</h2>
        </template>
        <div class="space-y-2">
          <div
            v-for="task in tasks.filter(t => t.kind === 'hours')"
            :key="task.id"
            class="flex items-center justify-between rounded-lg border border-border px-3 py-2"
          >
            <div>
              <p class="text-sm font-medium text-fg">{{ task.title }}</p>
              <p class="text-xs text-fg-muted">{{ task.boatName }} · {{ task.subject }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-semibold text-fg">{{ task.currentEngineHours ?? 0 }}h / {{ task.dueEngineHours }}h</p>
              <div class="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-surface-muted">
                <div
                  class="h-full rounded-full transition-all"
                  :class="(task.currentEngineHours ?? 0) >= (task.dueEngineHours ?? 1) ? 'bg-red-500' : 'bg-lagoon-500'"
                  :style="{ width: `${Math.min(100, ((task.currentEngineHours ?? 0) / (task.dueEngineHours ?? 1)) * 100)}%` }"
                />
              </div>
            </div>
          </div>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
