<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { router } from '@inertiajs/vue3'
import {
  ChevronRightIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/vue/24/outline'
import { computed, ref } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import BoatMaintenanceTasksPanel from '~/components/boats/maintenance/BoatMaintenanceTasksPanel.vue'
import BoatShowEnginesCard from '~/components/boats/engine/BoatShowEnginesCard.vue'
import BoatShowRigCard from '~/components/boats/rig/BoatShowRigCard.vue'
import BoatShowSailsCard from '~/components/boats/sail/BoatShowSailsCard.vue'
import type { BoatShowDetail, MaintenanceEventRow, MaintenanceTaskRow } from '~/types/boat_show'
import { subjectLabel, performedDisplay, targetDescription } from '~/components/boats/maintenance/utils'
import { useT } from '~/composables/useT'

const { t } = useT()

const props = defineProps<{
  boat: BoatShowDetail
  maintenanceEvents: MaintenanceEventRow[]
  maintenanceTasks: MaintenanceTaskRow[]
  canManageMaintenance: boolean
  canManageEquipment: boolean
}>()

type TabKey = 'overview' | 'specs' | 'equipment' | 'history' | 'tasks' | 'documents'
const tab = ref<TabKey>('overview')
const createTaskNonce = ref(0)

const todayIso = computed(() => new Date().toISOString().slice(0, 10))

// Task computations
const openTasks = computed(() => props.maintenanceTasks.filter((t) => t.status === 'open'))

const overdueTasks = computed(() =>
  openTasks.value.filter((t) => t.dueAt && String(t.dueAt) <= todayIso.value)
)

const soonTasks = computed(() => {
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  const soonIso = thirtyDaysFromNow.toISOString().slice(0, 10)
  return openTasks.value.filter(
    (t) => t.dueAt && String(t.dueAt) > todayIso.value && String(t.dueAt) <= soonIso
  )
})

const plannedTasks = computed(() => {
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  const soonIso = thirtyDaysFromNow.toISOString().slice(0, 10)
  return openTasks.value.filter((t) => !t.dueAt || String(t.dueAt) > soonIso)
})

// Status badge
const statusBadge = computed(() => {
  if (overdueTasks.value.length > 0) return { variant: 'warning' as const, label: t('boats.show.status.urgent') }
  if (openTasks.value.length > 0) return { variant: 'info' as const, label: t('boats.show.status.upcoming') }
  return { variant: 'success' as const, label: t('boats.show.status.ok') }
})

// Engine hours total
const totalEngineHours = computed(() => {
  const enginesWithHours = props.boat.engines.filter((e) => e.hours !== null)
  if (enginesWithHours.length === 0) return null
  return enginesWithHours.reduce((sum, e) => sum + (e.hours ?? 0), 0)
})

// Last maintenance date
const lastMaintenanceDate = computed(() => {
  if (props.maintenanceEvents.length === 0) return null
  const sorted = [...props.maintenanceEvents].sort((a, b) =>
    String(b.performedAt).localeCompare(String(a.performedAt))
  )
  return sorted[0]?.performedAt ?? null
})

// Next task due date
const nextTaskDueDate = computed(() => {
  const tasksWithDueAt = openTasks.value.filter((t) => t.dueAt)
  if (tasksWithDueAt.length === 0) return null
  tasksWithDueAt.sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)))
  return tasksWithDueAt[0]?.dueAt ?? null
})

// Recent activity (last 5 events)
const recentEvents = computed(() => {
  const sorted = [...props.maintenanceEvents].sort((a, b) =>
    String(b.performedAt).localeCompare(String(a.performedAt))
  )
  return sorted.slice(0, 5)
})

// History tab: group events by month
const eventsByMonth = computed(() => {
  const sorted = [...props.maintenanceEvents].sort((a, b) =>
    String(b.performedAt).localeCompare(String(a.performedAt))
  )
  const groups: Record<string, MaintenanceEventRow[]> = {}
  for (const ev of sorted) {
    const monthKey = ev.performedAt.slice(0, 7)
    if (!groups[monthKey]) groups[monthKey] = []
    groups[monthKey].push(ev)
  }
  return groups
})

// History filter
const historyFilter = ref<'all' | 'engine' | 'sail' | 'rig' | 'boat'>('all')
const historySearch = ref('')

const filteredEvents = computed(() => {
  let events = props.maintenanceEvents
  if (historyFilter.value !== 'all') {
    events = events.filter((e) => e.subject === historyFilter.value)
  }
  if (historySearch.value.trim()) {
    const q = historySearch.value.toLowerCase()
    events = events.filter((e) => e.title.toLowerCase().includes(q))
  }
  return events.sort((a, b) => String(b.performedAt).localeCompare(String(a.performedAt)))
})

const filteredEventsByMonth = computed(() => {
  const groups: Record<string, MaintenanceEventRow[]> = {}
  for (const ev of filteredEvents.value) {
    const monthKey = ev.performedAt.slice(0, 7)
    if (!groups[monthKey]) groups[monthKey] = []
    groups[monthKey].push(ev)
  }
  return groups
})

// History stats (last 12 months)
const historyStats = computed(() => {
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)
  const cutoff = twelveMonthsAgo.toISOString().slice(0, 10)
  const recentEvents = props.maintenanceEvents.filter((e) => e.performedAt >= cutoff)
  const totalParts = recentEvents.reduce((sum, e) => sum + e.parts.length, 0)
  return { eventCount: recentEvents.length, partCount: totalParts }
})

// Tasks filter
const tasksFilter = ref<'all' | 'overdue' | 'soon' | 'planned'>('all')

const filteredTasks = computed(() => {
  switch (tasksFilter.value) {
    case 'overdue':
      return overdueTasks.value
    case 'soon':
      return soonTasks.value
    case 'planned':
      return plannedTasks.value
    default:
      return openTasks.value
  }
})

// Equipment filter
const equipmentFilter = ref<'all' | 'engine' | 'sail' | 'rig'>('all')

// Tab definitions
const tabs = computed(() => [
  { key: 'overview', label: "Vue d'ensemble" },
  { key: 'specs', label: 'Specifications' },
  { key: 'equipment', label: 'Equipements' },
  { key: 'history', label: 'Historique' },
  { key: 'tasks', label: 'Taches', badge: openTasks.value.length > 0 ? String(openTasks.value.length) : undefined },
  { key: 'documents', label: 'Documents' },
])

// Helpers
function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function goToTab(key: TabKey) {
  tab.value = key
}

function getTaskComponentLabel(task: MaintenanceTaskRow): string {
  if (task.subject === 'engine' && task.boatEngineId) {
    const engine = props.boat.engines.find((e) => e.id === task.boatEngineId)
    if (engine) return `${engine.kind} ${engine.brand ?? ''} ${engine.model ?? ''}`.trim()
  }
  if (task.subject === 'sail' && task.boatSailId) {
    const sail = props.boat.sails.find((s) => s.id === task.boatSailId)
    if (sail) return sail.sailType
  }
  if (task.subject === 'rig') return 'Greement'
  return subjectLabel(task.subject)
}

// Expanded event details
const expandedEventId = ref<number | null>(null)
function toggleEventDetails(eventId: number) {
  expandedEventId.value = expandedEventId.value === eventId ? null : eventId
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
    <!-- Breadcrumb -->
    <nav class="mb-4 flex items-center gap-1 text-sm text-fg-muted">
      <a href="/boats" class="hover:text-fg hover:underline">Flotte</a>
      <ChevronRightIcon class="h-4 w-4" />
      <span>Bateaux</span>
      <ChevronRightIcon class="h-4 w-4" />
      <span class="text-fg">{{ boat.name }}</span>
    </nav>

    <!-- Header -->
    <header class="space-y-6">
      <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-3">
            <BaseHeading level="1">{{ boat.name }}</BaseHeading>
            <BaseBadge :variant="statusBadge.variant">
              {{ statusBadge.label }}
            </BaseBadge>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
            <span v-if="boat.type">{{ boat.type }}</span>
            <span v-if="boat.type && boat.registrationNumber" class="text-fg-subtle">·</span>
            <span v-if="boat.registrationNumber">{{ boat.registrationNumber }}</span>
            <span v-if="(boat.type || boat.registrationNumber) && boat.propulsionType" class="text-fg-subtle">·</span>
            <span v-if="boat.propulsionType">{{ boat.propulsionType }}</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 justify-end">
          <a :href="`/boats/${boat.id}/edit`">
            <BaseButton variant="secondary" size="sm">Modifier</BaseButton>
          </a>
          <BaseButton
            v-if="canManageMaintenance"
            variant="secondary"
            size="sm"
            type="button"
            @click="goToTab('history'); createTaskNonce++"
          >
            + Evenement
          </BaseButton>
          <BaseButton
            v-if="canManageMaintenance"
            variant="primary"
            size="sm"
            type="button"
            @click="goToTab('tasks'); createTaskNonce++"
          >
            + Tache
          </BaseButton>
        </div>
      </div>

      <!-- Tab bar -->
      <BaseTabs v-model="tab" :tabs="tabs" />
    </header>

    <div class="mt-8">
      <!-- Tab 1: Vue d'ensemble (overview) -->
      <div v-if="tab === 'overview'" class="flex flex-col lg:flex-row gap-6">
        <!-- Left column -->
        <div class="flex-1 space-y-6">
          <!-- Overdue alert -->
          <div
            v-if="overdueTasks.length > 0"
            class="rounded-lg border border-coral-300 bg-coral-50 p-4"
          >
            <div class="flex items-start gap-3">
              <ExclamationTriangleIcon class="h-5 w-5 text-coral-600 shrink-0 mt-0.5" />
              <div class="flex-1">
                <p class="font-semibold text-coral-900">{{ overdueTasks.length }} tache(s) en retard</p>
                <ul class="mt-2 space-y-1 text-sm text-coral-800">
                  <li v-for="task in overdueTasks.slice(0, 3)" :key="task.id">
                    {{ task.title }} - {{ formatDate(task.dueAt) }}
                  </li>
                </ul>
                <BaseButton
                  variant="secondary"
                  size="sm"
                  class="mt-3"
                  @click="goToTab('tasks')"
                >
                  Planifier
                </BaseButton>
              </div>
            </div>
          </div>

          <!-- KPI row -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <BaseCard padded>
              <div class="text-center">
                <p class="text-2xl font-bold text-fg">{{ totalEngineHours ?? '—' }}</p>
                <p class="text-sm text-fg-muted">Heures moteur</p>
                <p class="text-xs text-fg-subtle">{{ boat.engines.length }} moteur(s)</p>
              </div>
            </BaseCard>
            <BaseCard padded>
              <div class="text-center">
                <p class="text-2xl font-bold text-fg">{{ formatDate(lastMaintenanceDate) }}</p>
                <p class="text-sm text-fg-muted">Derniere maintenance</p>
              </div>
            </BaseCard>
            <BaseCard padded>
              <div class="text-center">
                <p class="text-2xl font-bold text-fg">{{ formatDate(nextTaskDueDate) }}</p>
                <p class="text-sm text-fg-muted">Prochaine tache</p>
                <BaseBadge
                  v-if="nextTaskDueDate && nextTaskDueDate <= todayIso"
                  variant="warning"
                  class="mt-1"
                >
                  En retard
                </BaseBadge>
              </div>
            </BaseCard>
          </div>

          <!-- Specs summary card -->
          <BaseCard padded>
            <template #header>
              <p class="text-sm font-semibold text-fg">Dimensions</p>
            </template>
            <dl class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt class="text-fg-muted">Longueur</dt>
                <dd class="font-semibold text-fg">{{ boat.lengthM ? `${boat.lengthM} m` : '—' }}</dd>
              </div>
              <div>
                <dt class="text-fg-muted">Bau</dt>
                <dd class="font-semibold text-fg">{{ boat.beamM ? `${boat.beamM} m` : '—' }}</dd>
              </div>
              <div>
                <dt class="text-fg-muted">Tirant d'eau</dt>
                <dd class="font-semibold text-fg">{{ boat.draftM ? `${boat.draftM} m` : '—' }}</dd>
              </div>
              <div>
                <dt class="text-fg-muted">Hauteur de mat</dt>
                <dd class="font-semibold text-fg">{{ boat.mastHeightM ? `${boat.mastHeightM} m` : '—' }}</dd>
              </div>
            </dl>
            <div class="mt-4">
              <button
                type="button"
                class="text-sm font-semibold text-brand hover:underline"
                @click="goToTab('specs')"
              >
                Voir les specifications &rarr;
              </button>
            </div>
          </BaseCard>

          <!-- Recent activity card -->
          <BaseCard padded>
            <template #header>
              <p class="text-sm font-semibold text-fg">Activite recente</p>
            </template>
            <div v-if="recentEvents.length === 0" class="text-sm text-fg-muted">
              Aucune activite recente.
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
              <button
                type="button"
                class="text-sm font-semibold text-brand hover:underline"
                @click="goToTab('history')"
              >
                Voir tout l'historique &rarr;
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
              Assistant IA
            </p>
            <div class="mt-3 space-y-2">
              <div class="rounded-lg bg-abyss-800 px-3 py-2 text-sm">
                Optimiser mon planning de maintenance
              </div>
              <div class="rounded-lg bg-abyss-800 px-3 py-2 text-sm">
                Estimer les couts annuels
              </div>
            </div>
          </div>

          <!-- TODO: add a `homePort` field to the Boat model/migration/form and display it here instead of registrationNumber -->
          <!-- Location placeholder -->
          <BaseCard padded>
            <p class="text-sm font-semibold text-fg">Port d'attache</p>
            <p class="mt-2 text-sm text-fg-muted">
              {{ boat.registrationNumber ?? 'Non renseigne' }}
            </p>
          </BaseCard>
        </div>
      </div>

      <!-- Tab 2: Specifications (specs) -->
      <div v-else-if="tab === 'specs'" class="flex flex-col lg:flex-row gap-6">
        <!-- Left column -->
        <div class="flex-1 space-y-6">
          <!-- Identite card -->
          <BaseCard padded>
            <template #header>
              <div class="flex items-center justify-between">
                <p class="text-sm font-semibold text-fg">Identite</p>
                <a :href="`/boats/${boat.id}/edit`">
                  <BaseButton variant="ghost" size="sm">Modifier</BaseButton>
                </a>
              </div>
            </template>
            <dl class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt class="text-fg-muted">Nom</dt>
                <dd class="font-semibold text-fg">{{ boat.name }}</dd>
              </div>
              <div>
                <dt class="text-fg-muted">Type</dt>
                <dd class="font-semibold text-fg">{{ boat.type ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-fg-muted">Immatriculation</dt>
                <dd class="font-semibold text-fg">{{ boat.registrationNumber ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-fg-muted">Annee de construction</dt>
                <dd class="font-semibold text-fg">{{ boat.yearBuilt ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-fg-muted">Constructeur</dt>
                <dd class="font-semibold text-fg">{{ boat.manufacturer ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-fg-muted">Modele</dt>
                <dd class="font-semibold text-fg">{{ boat.model ?? '—' }}</dd>
              </div>
            </dl>
          </BaseCard>

          <!-- Dimensions card -->
          <BaseCard padded>
            <template #header>
              <p class="text-sm font-semibold text-fg">Dimensions</p>
            </template>
            <dl class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt class="text-fg-muted">Longueur</dt>
                <dd class="font-semibold text-fg">{{ boat.lengthM ? `${boat.lengthM} m` : '—' }}</dd>
              </div>
              <div>
                <dt class="text-fg-muted">Bau</dt>
                <dd class="font-semibold text-fg">{{ boat.beamM ? `${boat.beamM} m` : '—' }}</dd>
              </div>
              <div>
                <dt class="text-fg-muted">Tirant d'eau</dt>
                <dd class="font-semibold text-fg">{{ boat.draftM ? `${boat.draftM} m` : '—' }}</dd>
              </div>
              <div>
                <dt class="text-fg-muted">Hauteur de mat</dt>
                <dd class="font-semibold text-fg">{{ boat.mastHeightM ? `${boat.mastHeightM} m` : '—' }}</dd>
              </div>
            </dl>
          </BaseCard>

          <!-- Coque & materiaux card -->
          <BaseCard padded>
            <template #header>
              <p class="text-sm font-semibold text-fg">Coque & materiaux</p>
            </template>
            <dl class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt class="text-fg-muted">Materiau coque</dt>
                <dd class="font-semibold text-fg">{{ boat.hullMaterial ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-fg-muted">Propulsion</dt>
                <dd class="font-semibold text-fg">{{ boat.propulsionType ?? '—' }}</dd>
              </div>
            </dl>
          </BaseCard>

          <!-- Equipements a bord card -->
          <BaseCard padded>
            <template #header>
              <p class="text-sm font-semibold text-fg">Equipements a bord</p>
            </template>
            <dl class="grid grid-cols-3 gap-4 text-sm">
              <div>
                <dt class="text-fg-muted">Moteurs</dt>
                <dd class="font-semibold text-fg">{{ boat.engines.length }}</dd>
              </div>
              <div>
                <dt class="text-fg-muted">Voiles</dt>
                <dd class="font-semibold text-fg">{{ boat.sails.length }}</dd>
              </div>
              <div>
                <dt class="text-fg-muted">Greement</dt>
                <dd class="font-semibold text-fg">{{ boat.rig ? 'Oui' : 'Non' }}</dd>
              </div>
            </dl>
          </BaseCard>
        </div>

        <!-- Right column (w-64) -->
        <div class="w-full lg:w-64 space-y-6">
          <BaseCard padded>
            <div class="flex items-start gap-3">
              <WrenchScrewdriverIcon class="h-5 w-5 text-fg-muted shrink-0" />
              <p class="text-sm text-fg-muted">
                Les specifications peuvent etre modifiees dans la page d'edition du bateau.
              </p>
            </div>
            <div class="mt-4">
              <a :href="`/boats/${boat.id}/edit`">
                <BaseButton variant="secondary" size="sm" class="w-full">
                  Modifier le bateau
                </BaseButton>
              </a>
            </div>
          </BaseCard>
        </div>
      </div>

      <!-- Tab 3: Equipements (equipment) -->
      <div v-else-if="tab === 'equipment'" class="space-y-6">
        <!-- Header row with filter pills -->
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="filter in [
                { key: 'all', label: 'Tous' },
                { key: 'engine', label: 'Moteur' },
                { key: 'sail', label: 'Voiles' },
                { key: 'rig', label: 'Greement' },
              ]"
              :key="filter.key"
              type="button"
              :class="[
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                equipmentFilter === filter.key
                  ? 'bg-brand text-white'
                  : 'bg-surface-muted text-fg-muted hover:bg-surface-elevated hover:text-fg',
              ]"
              @click="equipmentFilter = filter.key as typeof equipmentFilter"
            >
              {{ filter.label }}
            </button>
          </div>
        </div>

        <!-- Engine cards -->
        <div v-if="equipmentFilter === 'all' || equipmentFilter === 'engine'">
          <BoatShowEnginesCard :boat-id="boat.id" :engines="boat.engines" :can-manage="canManageEquipment" />
        </div>

        <!-- Sail cards -->
        <div v-if="equipmentFilter === 'all' || equipmentFilter === 'sail'">
          <BoatShowSailsCard :boat-id="boat.id" :sails="boat.sails" :can-manage="canManageEquipment" />
        </div>

        <!-- Rig card -->
        <div v-if="equipmentFilter === 'all' || equipmentFilter === 'rig'">
          <BoatShowRigCard :boat-id="boat.id" :rig="boat.rig" :can-manage="canManageEquipment" />
        </div>
      </div>

      <!-- Tab 4: Historique (history) -->
      <div v-else-if="tab === 'history'" class="flex flex-col lg:flex-row gap-6">
        <!-- Main content -->
        <div class="flex-1 space-y-6">
          <!-- Search and filters -->
          <div class="flex flex-wrap items-center gap-4">
            <input
              v-model="historySearch"
              type="text"
              placeholder="Rechercher..."
              class="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <div class="flex flex-wrap gap-2">
              <button
                v-for="filter in [
                  { key: 'all', label: 'Tous' },
                  { key: 'engine', label: 'Moteur' },
                  { key: 'sail', label: 'Voile' },
                  { key: 'rig', label: 'Greement' },
                  { key: 'boat', label: 'Coque' },
                ]"
                :key="filter.key"
                type="button"
                :class="[
                  'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  historyFilter === filter.key
                    ? 'bg-brand text-white'
                    : 'bg-surface-muted text-fg-muted hover:bg-surface-elevated hover:text-fg',
                ]"
                @click="historyFilter = filter.key as typeof historyFilter"
              >
                {{ filter.label }}
              </button>
            </div>
          </div>

          <!-- Events grouped by month -->
          <div v-if="Object.keys(filteredEventsByMonth).length === 0" class="text-sm text-fg-muted">
            Aucun evenement trouve.
          </div>
          <div v-else class="space-y-8">
            <div v-for="(events, monthKey) in filteredEventsByMonth" :key="monthKey">
              <h3 class="text-sm font-semibold text-fg-muted uppercase tracking-wider mb-4">
                {{ formatMonth(monthKey) }}
              </h3>
              <ul class="space-y-3">
                <li
                  v-for="ev in events"
                  :key="ev.id"
                  class="rounded-lg border border-border bg-surface-elevated p-4"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex items-start gap-4">
                      <div class="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center text-sm font-bold text-fg">
                        {{ new Date(ev.performedAt).getDate() }}
                      </div>
                      <div>
                        <p class="font-semibold text-fg">{{ ev.title }}</p>
                        <p class="text-sm text-fg-muted">
                          {{ subjectLabel(ev.subject) }}
                          <span v-if="targetDescription(ev) !== subjectLabel(ev.subject)">
                            · {{ targetDescription(ev) }}
                          </span>
                        </p>
                        <div v-if="ev.parts.length > 0" class="mt-2 flex items-center gap-2">
                          <BaseBadge variant="neutral">{{ ev.parts.length }} piece(s)</BaseBadge>
                          <button
                            type="button"
                            class="text-xs font-semibold text-brand hover:underline"
                            @click="toggleEventDetails(ev.id)"
                          >
                            {{ expandedEventId === ev.id ? 'Masquer' : 'Detail' }}
                          </button>
                        </div>
                        <!-- Expanded parts list -->
                        <div v-if="expandedEventId === ev.id && ev.parts.length > 0" class="mt-3 pl-4 border-l-2 border-border">
                          <ul class="space-y-1 text-sm">
                            <li v-for="part in ev.parts" :key="part.id" class="text-fg-muted">
                              {{ part.name }}
                              <span v-if="part.quantity" class="text-fg-subtle">(x{{ part.quantity }})</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Right sidebar (w-56) -->
        <div class="w-full lg:w-56 space-y-6">
          <BaseCard padded>
            <p class="text-sm font-semibold text-fg">12 derniers mois</p>
            <dl class="mt-3 space-y-2 text-sm">
              <div class="flex items-center justify-between">
                <dt class="text-fg-muted">Evenements</dt>
                <dd class="font-semibold text-fg">{{ historyStats.eventCount }}</dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="text-fg-muted">Pieces</dt>
                <dd class="font-semibold text-fg">{{ historyStats.partCount }}</dd>
              </div>
            </dl>
          </BaseCard>
          <!-- TODO: implement PDF export for maintenance history (e.g. GET /boats/:id/maintenance/history.pdf) -->
          <BaseButton variant="secondary" size="sm" class="w-full" disabled>
            <DocumentTextIcon class="h-4 w-4 mr-2" />
            Exporter PDF
          </BaseButton>
        </div>
      </div>

      <!-- Tab 5: Taches (tasks) -->
      <div v-else-if="tab === 'tasks'" class="space-y-6">
        <!-- Header with filter pills -->
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="filter in [
                { key: 'all', label: 'Toutes' },
                { key: 'overdue', label: 'En retard', count: overdueTasks.length },
                { key: 'soon', label: 'Bientot', count: soonTasks.length },
                { key: 'planned', label: 'Planifiees', count: plannedTasks.length },
              ]"
              :key="filter.key"
              type="button"
              :class="[
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-2',
                tasksFilter === filter.key
                  ? 'bg-brand text-white'
                  : 'bg-surface-muted text-fg-muted hover:bg-surface-elevated hover:text-fg',
              ]"
              @click="tasksFilter = filter.key as typeof tasksFilter"
            >
              {{ filter.label }}
              <span
                v-if="filter.count !== undefined && filter.count > 0"
                :class="[
                  'rounded-full px-2 py-0.5 text-xs font-semibold',
                  tasksFilter === filter.key ? 'bg-white/20' : 'bg-surface-elevated',
                ]"
              >
                {{ filter.count }}
              </span>
            </button>
          </div>
        </div>

        <!-- Overdue section -->
        <div v-if="(tasksFilter === 'all' || tasksFilter === 'overdue') && overdueTasks.length > 0" class="space-y-3">
          <h3 class="flex items-center gap-2 text-sm font-semibold text-coral-700">
            <ExclamationTriangleIcon class="h-4 w-4" />
            En retard
          </h3>
          <div class="space-y-3 border-l-4 border-coral-400 pl-4">
            <div
              v-for="task in overdueTasks"
              :key="task.id"
              class="rounded-lg border border-coral-200 bg-coral-50 p-4"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-fg">{{ task.title }}</p>
                  <p class="text-sm text-fg-muted">{{ getTaskComponentLabel(task) }}</p>
                  <p v-if="task.dueAt" class="mt-1 text-xs text-coral-700">
                    Echeance: {{ formatDate(task.dueAt) }}
                  </p>
                  <p v-else-if="task.dueEngineHours !== null" class="mt-1 text-xs text-coral-700">
                    A {{ task.dueEngineHours }} heures moteur
                  </p>
                </div>
                <div v-if="canManageMaintenance" class="flex items-center gap-2">
                  <Form
                    :action="{ url: `/boats/${boat.id}/maintenance-tasks/${task.id}/done`, method: 'put' }"
                    #default="{ processing }"
                  >
                    <BaseButton type="submit" variant="secondary" size="sm" :disabled="processing">
                      Marquer fait
                    </BaseButton>
                  </Form>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Soon section -->
        <div v-if="(tasksFilter === 'all' || tasksFilter === 'soon') && soonTasks.length > 0" class="space-y-3">
          <h3 class="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <ClockIcon class="h-4 w-4" />
            A venir bientot
          </h3>
          <div class="space-y-3 border-l-4 border-amber-400 pl-4">
            <div
              v-for="task in soonTasks"
              :key="task.id"
              class="rounded-lg border border-amber-200 bg-amber-50 p-4"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-fg">{{ task.title }}</p>
                  <p class="text-sm text-fg-muted">{{ getTaskComponentLabel(task) }}</p>
                  <p v-if="task.dueAt" class="mt-1 text-xs text-amber-700">
                    Echeance: {{ formatDate(task.dueAt) }}
                  </p>
                </div>
                <div v-if="canManageMaintenance" class="flex items-center gap-2">
                  <Form
                    :action="{ url: `/boats/${boat.id}/maintenance-tasks/${task.id}/done`, method: 'put' }"
                    #default="{ processing }"
                  >
                    <BaseButton type="submit" variant="secondary" size="sm" :disabled="processing">
                      Marquer fait
                    </BaseButton>
                  </Form>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Planned section -->
        <div v-if="(tasksFilter === 'all' || tasksFilter === 'planned') && plannedTasks.length > 0" class="space-y-3">
          <h3 class="text-sm font-semibold text-fg-muted">Planifiees</h3>
          <div class="space-y-2">
            <div
              v-for="task in plannedTasks"
              :key="task.id"
              class="flex items-center justify-between rounded-lg border border-border bg-surface-elevated px-4 py-3"
            >
              <div>
                <p class="font-semibold text-fg">{{ task.title }}</p>
                <p class="text-sm text-fg-muted">{{ getTaskComponentLabel(task) }}</p>
              </div>
              <div class="flex items-center gap-3">
                <span v-if="task.dueAt" class="text-sm text-fg-subtle">{{ formatDate(task.dueAt) }}</span>
                <span v-else-if="task.dueEngineHours !== null" class="text-sm text-fg-subtle">
                  {{ task.dueEngineHours }}h
                </span>
                <Form
                  v-if="canManageMaintenance"
                  :action="{ url: `/boats/${boat.id}/maintenance-tasks/${task.id}/done`, method: 'put' }"
                  #default="{ processing }"
                >
                  <BaseButton type="submit" variant="ghost" size="sm" :disabled="processing">
                    Fait
                  </BaseButton>
                </Form>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-if="filteredTasks.length === 0"
          class="rounded-lg border border-dashed border-border bg-surface-muted/30 p-8 text-center"
        >
          <p class="text-fg-muted">Aucune tache correspondante.</p>
        </div>

        <!-- Tasks panel for creation -->
        <div class="mt-8 pt-8 border-t border-border">
          <BoatMaintenanceTasksPanel
            :boat="boat"
            :tasks="maintenanceTasks"
            :can-manage-maintenance="canManageMaintenance"
            :create-task-nonce="createTaskNonce"
          />
        </div>
      </div>

      <!-- Tab 6: Documents -->
      <div v-else-if="tab === 'documents'" class="space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <p class="text-sm text-fg-muted">Gerez les documents de votre bateau.</p>
          <!-- TODO: implement document upload: create BoatDocument model + migration, POST /boats/:id/documents, store in S3/local -->
          <BaseButton variant="secondary" size="sm" disabled>
            + Ajouter un document
          </BaseButton>
        </div>

        <!-- TODO: remove this banner once document upload is implemented -->
        <!-- Note banner -->
        <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Fonctionnalite a venir : la gestion des documents sera bientot disponible.
        </div>

        <!-- Document groups -->
        <div class="space-y-6">
          <!-- TODO: implement file drag-and-drop upload using the HTML5 File API, send to POST /boats/:id/documents -->
          <!-- Reglementaire -->
          <div>
            <h3 class="text-sm font-semibold text-fg mb-3">Reglementaire</h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                v-for="docType in ['Certificat de jauge', 'Permis de navigation', 'Assurance']"
                :key="docType"
                class="rounded-lg border-2 border-dashed border-border bg-surface-muted/30 p-6 text-center"
              >
                <DocumentTextIcon class="h-8 w-8 text-fg-subtle mx-auto mb-2" />
                <p class="text-sm text-fg-muted">{{ docType }}</p>
                <p class="text-xs text-fg-subtle mt-1">Deposer un fichier</p>
              </div>
            </div>
          </div>

          <!-- Constructeur -->
          <div>
            <h3 class="text-sm font-semibold text-fg mb-3">Constructeur</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                v-for="docType in ['Manuel utilisateur', 'Fiche technique']"
                :key="docType"
                class="rounded-lg border-2 border-dashed border-border bg-surface-muted/30 p-6 text-center"
              >
                <DocumentTextIcon class="h-8 w-8 text-fg-subtle mx-auto mb-2" />
                <p class="text-sm text-fg-muted">{{ docType }}</p>
                <p class="text-xs text-fg-subtle mt-1">Deposer un fichier</p>
              </div>
            </div>
          </div>

          <!-- Divers -->
          <div>
            <h3 class="text-sm font-semibold text-fg mb-3">Divers</h3>
            <div class="rounded-lg border-2 border-dashed border-border bg-surface-muted/30 p-8 text-center">
              <DocumentTextIcon class="h-8 w-8 text-fg-subtle mx-auto mb-2" />
              <p class="text-sm text-fg-muted">Deposer un document</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
