<script setup lang="ts">
import { computed, ref } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import { useT } from '~/composables/useT'

const { t } = useT()

interface Engine {
  id: number
  kind: string
  fuel: string | null
  brand: string | null
  model: string | null
  serialNumber: string | null
  manufacturedAt: string | null
  powerHp: number | null
  hours: number | null
}

interface MaintenanceEvent {
  id: number
  subject: string
  title: string
  notes: string | null
  performedAt: string
  engineCaption: string | null
  parts: Array<{ id: number; name: string; quantity: number | null; notes: string | null }>
}

interface MaintenanceTask {
  id: number
  subject: string
  title: string
  notes: string | null
  status: 'open' | 'done'
  dueAt: string | null
  dueEngineHours: number | null
  boatEngineId: number | null
  recurrenceIntervalEngineHours: number | null
}

const props = defineProps<{
  boat: { id: number; name: string }
  engine: Engine
  maintenanceEvents: MaintenanceEvent[]
  maintenanceTasks: MaintenanceTask[]
  canManage: boolean
}>()

type TabKey = 'overview' | 'specs' | 'maintenance' | 'notes' | 'parts' | 'documents'
const tab = ref<TabKey>('overview')

const todayIso = computed(() => new Date().toISOString().slice(0, 10))

const openTasks = computed(() => props.maintenanceTasks.filter((t) => t.status === 'open'))

const overdueTask = computed(() =>
  openTasks.value.find(
    (t) =>
      t.dueEngineHours !== null &&
      props.engine.hours !== null &&
      props.engine.hours >= t.dueEngineHours
  )
)

const hasOverdue = computed(() => Boolean(overdueTask.value))

const sortedOpenTasks = computed(() => {
  return [...openTasks.value].sort((a, b) => {
    if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt)
    if (a.dueAt) return -1
    if (b.dueAt) return 1
    if (a.dueEngineHours !== null && b.dueEngineHours !== null) return a.dueEngineHours - b.dueEngineHours
    return 0
  })
})

const recentEvents = computed(() => {
  return [...props.maintenanceEvents]
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt))
    .slice(0, 3)
})

const latestEvent = computed(() => recentEvents.value[0])

const hoursSinceLastMaint = computed(() => {
  if (!latestEvent.value || props.engine.hours === null) return null
  return props.engine.hours
})

const nearestThreshold = computed(() => {
  const thresholds = openTasks.value
    .filter((t) => t.dueEngineHours !== null)
    .map((t) => t.dueEngineHours as number)
  if (thresholds.length === 0) return null
  return Math.min(...thresholds)
})

const hoursProgress = computed(() => {
  if (props.engine.hours === null || nearestThreshold.value === null) return 0
  return Math.min((props.engine.hours / nearestThreshold.value) * 100, 100)
})

const isOverThreshold = computed(() => {
  return props.engine.hours !== null && nearestThreshold.value !== null && props.engine.hours >= nearestThreshold.value
})

function getTaskStatus(task: MaintenanceTask): 'overdue' | 'soon' | 'scheduled' {
  if (task.dueEngineHours !== null && props.engine.hours !== null && props.engine.hours >= task.dueEngineHours) {
    return 'overdue'
  }
  if (task.dueAt && task.dueAt <= todayIso.value) {
    return 'overdue'
  }
  if (task.dueEngineHours !== null && props.engine.hours !== null) {
    const remaining = task.dueEngineHours - props.engine.hours
    if (remaining <= 50) return 'soon'
  }
  return 'scheduled'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatYear(iso: string): string {
  return new Date(iso).getFullYear().toString()
}

const eventsByYearMonth = computed(() => {
  const groups: Record<string, MaintenanceEvent[]> = {}
  const sorted = [...props.maintenanceEvents].sort((a, b) => b.performedAt.localeCompare(a.performedAt))
  for (const event of sorted) {
    const key = event.performedAt.slice(0, 7)
    if (!groups[key]) groups[key] = []
    groups[key].push(event)
  }
  return groups
})

const engineTitle = computed(() => {
  if (props.engine.brand && props.engine.model) {
    return `${props.engine.brand} ${props.engine.model}`
  }
  if (props.engine.brand) return props.engine.brand
  if (props.engine.model) return props.engine.model
  return props.engine.kind
})

const totalParts = computed(() => {
  return props.maintenanceEvents.reduce((sum, e) => sum + e.parts.length, 0)
})

// TODO: implement cost tracking — add a `costEuros` field to BoatMaintenanceEvent and aggregate here
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb :items="[
      { label: t('boats.show.breadcrumbFleet'), href: '/boats' },
      { label: boat.name, href: `/boats/${boat.id}` },
      { label: t('boats.engineShow.breadcrumb.equipment') },
      { label: engineTitle },
    ]" />

    <!-- Header -->
    <header class="space-y-6">
      <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-3">
            <BaseHeading level="1">{{ engineTitle }}</BaseHeading>
            <BaseBadge v-if="hasOverdue" variant="warning">{{ t('boats.engineShow.maintenanceRequired') }}</BaseBadge>
          </div>
          <div class="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-fg-muted">
            <p v-if="engine.fuel">{{ engine.fuel }}</p>
            <p v-if="engine.powerHp">{{ engine.powerHp }} HP</p>
            <p v-if="engine.manufacturedAt">{{ t('boats.engineShow.installedIn', { year: formatYear(engine.manufacturedAt) }) }}</p>
          </div>
        </div>

        <div v-if="canManage" class="flex flex-wrap items-center gap-2 justify-end">
          <BaseButton
            variant="secondary"
            size="sm"
            :href="`/boats/${boat.id}/engines/${engine.id}/edit`"
          >
            {{ t('boats.engineShow.actions.edit') }}
          </BaseButton>
          <!-- TODO: this URL /boats/:id/maintenance/events/new?engineId=:id does not exist yet — implement the route+controller+page or replace with an inline modal -->
          <BaseButton size="sm" :href="`/boats/${boat.id}/maintenance/events/new?engineId=${engine.id}`">
            {{ t('boats.engineShow.actions.addEvent') }}
          </BaseButton>
        </div>
      </div>

      <!-- Tabs -->
      <BaseTabs
        v-model="tab"
        :tabs="[
          { key: 'overview', label: t('boats.engineShow.tabs.overview') },
          { key: 'specs', label: t('boats.engineShow.tabs.specs') },
          { key: 'maintenance', label: t('boats.engineShow.tabs.maintenance'), badge: String(openTasks.length) },
          { key: 'notes', label: t('boats.engineShow.tabs.notes') },
          { key: 'parts', label: t('boats.engineShow.tabs.parts') },
          { key: 'documents', label: t('boats.engineShow.tabs.documents') },
        ]"
      />
    </header>

    <div class="mt-8">
      <!-- Tab: Vue d'ensemble -->
      <div v-if="tab === 'overview'" class="flex flex-col lg:flex-row gap-6">
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
            <!-- TODO: compute real cost from maintenanceEvents once costEuros field is added to BoatMaintenanceEvent -->
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
          <!-- TODO: replace hardcoded AI prompts with dynamic suggestions from backend -->
          <!-- TODO: wire click on each suggestion to POST /ai/engine-analysis?engineId=:id -->
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

      <!-- Tab: Specifications -->
      <div v-else-if="tab === 'specs'" class="flex flex-col lg:flex-row gap-6">
        <div class="flex-1 space-y-6">
          <!-- Identite -->
          <BaseCard>
            <p class="text-sm font-semibold text-fg mb-4">{{ t('boats.engineShow.specs.identity') }}</p>
            <dl class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt class="text-fg-muted">{{ t('boats.engineShow.specs.brand') }}</dt>
                <dd class="font-medium text-fg">{{ engine.brand ?? '-' }}</dd>
              </div>
              <div>
                <dt class="text-fg-muted">{{ t('boats.engineShow.specs.model') }}</dt>
                <dd class="font-medium text-fg">{{ engine.model ?? '-' }}</dd>
              </div>
              <div>
                <dt class="text-fg-muted">{{ t('boats.engineShow.specs.serialNumber') }}</dt>
                <dd class="font-medium text-fg">{{ engine.serialNumber ?? '-' }}</dd>
              </div>
              <div>
                <dt class="text-fg-muted">{{ t('boats.engineShow.specs.installYear') }}</dt>
                <dd class="font-medium text-fg">
                  {{ engine.manufacturedAt ? formatYear(engine.manufacturedAt) : '-' }}
                </dd>
              </div>
              <div>
                <dt class="text-fg-muted">{{ t('boats.engineShow.specs.installHours') }}</dt>
                <dd class="font-medium text-fg">0</dd>
              </div>
            </dl>
          </BaseCard>

          <!-- Caracteristiques -->
          <BaseCard>
            <p class="text-sm font-semibold text-fg mb-4">{{ t('boats.engineShow.specs.characteristics') }}</p>
            <dl class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt class="text-fg-muted">{{ t('boats.engineShow.specs.power') }}</dt>
                <dd class="font-medium text-fg">{{ engine.powerHp ? `${engine.powerHp} HP` : '-' }}</dd>
              </div>
              <div>
                <dt class="text-fg-muted">{{ t('boats.engineShow.specs.fuel') }}</dt>
                <dd class="font-medium text-fg">{{ engine.fuel ?? '-' }}</dd>
              </div>
              <div>
                <dt class="text-fg-muted">{{ t('boats.engineShow.specs.type') }}</dt>
                <dd class="font-medium text-fg">{{ engine.kind }}</dd>
              </div>
            </dl>
          </BaseCard>

          <!-- Seuils de maintenance -->
          <BaseCard>
            <p class="text-sm font-semibold text-fg mb-4">{{ t('boats.engineShow.specs.thresholds') }}</p>
            <div v-if="openTasks.filter(t => t.recurrenceIntervalEngineHours).length === 0" class="text-sm text-fg-muted">
              {{ t('boats.engineShow.specs.noThreshold') }}
            </div>
            <ul v-else class="space-y-3">
              <li
                v-for="task in openTasks.filter(t => t.recurrenceIntervalEngineHours)"
                :key="task.id"
                class="flex items-center justify-between text-sm"
              >
                <span class="font-medium text-fg">{{ task.title }}</span>
                <span class="text-fg-muted">{{ t('boats.engineShow.specs.every', { hours: String(task.recurrenceIntervalEngineHours) }) }}</span>
              </li>
            </ul>
          </BaseCard>
        </div>

        <!-- Right info -->
        <div class="w-full lg:w-64">
          <BaseCard>
            <p class="text-sm text-fg-muted">
              {{ t('boats.engineShow.specs.editHint') }}
            </p>
            <div class="mt-4">
              <BaseButton
                variant="secondary"
                size="sm"
                :href="`/boats/${boat.id}/engines/${engine.id}/edit`"
              >
                {{ t('boats.engineShow.actions.edit') }}
              </BaseButton>
            </div>
          </BaseCard>
        </div>
      </div>

      <!-- Tab: Maintenance -->
      <div v-else-if="tab === 'maintenance'" class="flex flex-col lg:flex-row gap-6">
        <div class="flex-1 space-y-8">
          <!-- A venir -->
          <section>
            <h2 class="text-lg font-semibold text-fg mb-4">{{ t('boats.engineShow.maintenance.upcoming') }}</h2>
            <div v-if="openTasks.length === 0" class="text-sm text-fg-muted">
              {{ t('boats.engineShow.maintenance.noUpcoming') }}
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="task in sortedOpenTasks"
                :key="task.id"
                class="rounded-lg border border-border bg-surface-elevated p-4"
              >
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <div class="flex items-center gap-2">
                      <p class="font-semibold text-fg">{{ task.title }}</p>
                      <BaseBadge
                        :variant="
                          getTaskStatus(task) === 'overdue'
                            ? 'warning'
                            : getTaskStatus(task) === 'soon'
                            ? 'info'
                            : 'neutral'
                        "
                      >
                        {{
                          getTaskStatus(task) === 'overdue'
                            ? t('boats.engineShow.maintenance.taskStatus.overdue')
                            : getTaskStatus(task) === 'soon'
                            ? t('boats.engineShow.maintenance.taskStatus.soon')
                            : t('boats.engineShow.maintenance.taskStatus.planned')
                        }}
                      </BaseBadge>
                    </div>
                    <p class="text-sm text-fg-muted mt-1">
                      <span v-if="task.dueAt">{{ t('boats.engineShow.maintenance.dueAt', { date: formatDate(task.dueAt) }) }}</span>
                      <span v-if="task.dueAt && task.dueEngineHours"> | </span>
                      <span v-if="task.dueEngineHours">{{ t('boats.engineShow.maintenance.dueHours', { hours: String(task.dueEngineHours) }) }}</span>
                    </p>
                  </div>
                  <div v-if="canManage" class="flex items-center gap-2">
                    <BaseButton variant="ghost" size="sm" href="/planning">
                      {{ t('boats.engineShow.actions.schedule') }}
                    </BaseButton>
                    <!-- TODO: wrong action URL — should be /boats/:boatId/maintenance-tasks/:taskId/done (PUT), not /maintenance/tasks/:id/complete -->
                    <Form
                      :action="`/boats/${boat.id}/maintenance/tasks/${task.id}/complete`"
                      method="post"
                      class="inline"
                    >
                      <BaseButton variant="secondary" size="sm" type="submit">
                        {{ t('boats.engineShow.actions.markDone') }}
                      </BaseButton>
                    </Form>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Historique -->
          <section>
            <h2 class="text-lg font-semibold text-fg mb-4">{{ t('boats.engineShow.maintenance.history') }}</h2>
            <div v-if="maintenanceEvents.length === 0" class="text-sm text-fg-muted">
              {{ t('boats.engineShow.maintenance.noHistory') }}
            </div>
            <div v-else class="space-y-6">
              <div v-for="(events, yearMonth) in eventsByYearMonth" :key="yearMonth">
                <p class="text-sm font-semibold text-fg-muted mb-3">
                  {{ new Date(yearMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) }}
                </p>
                <div class="space-y-2">
                  <div
                    v-for="event in events"
                    :key="event.id"
                    class="flex items-center justify-between rounded-lg border border-border bg-surface-elevated p-3"
                  >
                    <div class="flex items-center gap-4">
                      <span class="text-sm text-fg-muted">{{ formatDate(event.performedAt) }}</span>
                      <span class="font-medium text-fg">{{ event.title }}</span>
                    </div>
                    <span v-if="event.parts.length > 0" class="text-sm text-fg-muted">
                      {{ t('boats.engineShow.maintenance.parts', { count: String(event.parts.length) }) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Right stats -->
        <div class="w-full lg:w-56 space-y-4">
          <BaseCard>
            <dl class="space-y-4 text-sm">
              <div class="flex items-center justify-between">
                <dt class="text-fg-muted">{{ t('boats.engineShow.maintenance.totalEvents') }}</dt>
                <dd class="font-semibold text-fg">{{ maintenanceEvents.length }}</dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="text-fg-muted">{{ t('boats.engineShow.maintenance.totalParts') }}</dt>
                <dd class="font-semibold text-fg">{{ totalParts }}</dd>
              </div>
            </dl>
          </BaseCard>
          <!-- TODO: implement PDF export for engine maintenance history -->
          <BaseButton variant="secondary" size="sm" class="w-full" disabled>
            {{ t('boats.engineShow.actions.exportPdf') }}
          </BaseButton>
        </div>
      </div>

      <!-- TODO: implement BoatEngineNote model + migration + CRUD (POST/DELETE /boats/:boatId/engines/:engineId/notes) -->
      <!-- Tab: Notes -->
      <div v-else-if="tab === 'notes'" class="space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-fg">{{ t('boats.engineShow.notes.title') }}</h2>
          <BaseButton variant="secondary" size="sm" disabled>
            {{ t('boats.engineShow.notes.add') }}
          </BaseButton>
        </div>

        <div class="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <div class="space-y-4 text-fg-muted">
            <p class="font-medium">{{ t('boats.engineShow.notes.types') }}</p>
            <div class="flex flex-wrap justify-center gap-4 text-sm">
              <span class="flex items-center gap-1">
                <span>&#128204;</span> {{ t('boats.engineShow.notes.followUp') }}
              </span>
              <span class="flex items-center gap-1">
                <span>&#9888;</span> {{ t('boats.engineShow.notes.anomaly') }}
              </span>
              <span class="flex items-center gap-1">
                <span>&#128161;</span> {{ t('boats.engineShow.notes.idea') }}
              </span>
            </div>
          </div>
          <BaseBadge variant="info" class="mt-6">{{ t('boats.engineShow.notes.comingSoon') }}</BaseBadge>
        </div>
      </div>

      <!-- TODO: implement BoatEnginePart catalog model + migration + CRUD (list/add/remove compatible parts per engine) -->
      <!-- Tab: Pieces -->
      <div v-else-if="tab === 'parts'" class="space-y-6">
        <h2 class="text-lg font-semibold text-fg">{{ t('boats.engineShow.parts.title') }}</h2>

        <div class="border-2 border-dashed border-border rounded-lg p-8">
          <table class="w-full text-sm text-left">
            <thead class="text-fg-muted">
              <tr>
                <th class="pb-3 font-medium">{{ t('boats.engineShow.parts.designation') }}</th>
                <th class="pb-3 font-medium">{{ t('boats.engineShow.parts.reference') }}</th>
                <th class="pb-3 font-medium">{{ t('boats.engineShow.parts.stock') }}</th>
                <th class="pb-3 font-medium">{{ t('boats.engineShow.parts.supplier') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="4" class="py-8 text-center text-fg-muted">
                  {{ t('boats.engineShow.parts.empty') }}
                </td>
              </tr>
            </tbody>
          </table>
          <div class="text-center mt-4">
            <BaseBadge variant="info">{{ t('boats.engineShow.parts.comingSoon') }}</BaseBadge>
          </div>
        </div>
      </div>

      <!-- TODO: implement document upload for engine documents — reuse the same BoatDocument model with a boatEngineId FK -->
      <!-- Tab: Documents -->
      <div v-else-if="tab === 'documents'" class="space-y-6">
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-fg">{{ t('boats.engineShow.documents.manual') }}</h3>
          <div class="border-2 border-dashed border-border rounded-lg p-6 text-center text-sm text-fg-muted">
            {{ t('boats.engineShow.documents.dropzone') }}
          </div>
        </div>

        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-fg">{{ t('boats.engineShow.documents.invoices') }}</h3>
          <div class="border-2 border-dashed border-border rounded-lg p-6 text-center text-sm text-fg-muted">
            {{ t('boats.engineShow.documents.dropzone') }}
          </div>
        </div>

        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-fg">{{ t('boats.engineShow.documents.other') }}</h3>
          <div class="border-2 border-dashed border-border rounded-lg p-6 text-center text-sm text-fg-muted">
            {{ t('boats.engineShow.documents.dropzone') }}
          </div>
        </div>

        <div class="text-center">
          <BaseBadge variant="info">{{ t('boats.engineShow.documents.comingSoon') }}</BaseBadge>
        </div>
      </div>
    </div>
  </div>
</template>
