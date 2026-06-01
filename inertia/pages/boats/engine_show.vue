<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { computed, onMounted, ref, watch } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import EngineMaintenanceEventModal from '~/components/engine/show/EngineMaintenanceEventModal.vue'
import EngineShowTabDocuments from '~/components/engine/show/tabs/EngineShowTabDocuments.vue'
import EngineShowTabMaintenance from '~/components/engine/show/tabs/EngineShowTabMaintenance.vue'
import EngineShowTabNotes from '~/components/engine/show/tabs/EngineShowTabNotes.vue'
import EngineShowTabOverview from '~/components/engine/show/tabs/EngineShowTabOverview.vue'
import EngineShowTabParts from '~/components/engine/show/tabs/EngineShowTabParts.vue'
import EngineShowTabSpecs from '~/components/engine/show/tabs/EngineShowTabSpecs.vue'
import { useT } from '~/composables/useT'
import type { BoatShowEngine, MaintenanceEventRow, MaintenanceTaskRow } from '~/types/boat_show'

const { t } = useT()

const props = defineProps<{
  boat: { id: number; name: string }
  engine: BoatShowEngine
  maintenanceEvents: MaintenanceEventRow[]
  maintenanceTasks: MaintenanceTaskRow[]
  canManage: boolean
}>()

type TabKey = 'overview' | 'specs' | 'maintenance' | 'notes' | 'parts' | 'documents'
const tab = ref<TabKey>('overview')
const addEventOpen = ref(false)

const VALID_TABS: TabKey[] = ['overview', 'specs', 'maintenance', 'notes', 'parts', 'documents']

onMounted(() => {
  const fromUrl = new URLSearchParams(window.location.search).get('tab') as TabKey | null
  if (fromUrl && VALID_TABS.includes(fromUrl)) tab.value = fromUrl
})

watch(tab, (newTab) => {
  const url = new URL(window.location.href)
  if (newTab === 'overview') {
    url.searchParams.delete('tab')
  } else {
    url.searchParams.set('tab', newTab)
  }
  window.history.replaceState(window.history.state, '', url.pathname + url.search)
})

const statusOptions = computed(() => [
  { value: 'operational', label: t('equipment.status.operational') },
  { value: 'in_maintenance', label: t('equipment.status.in_maintenance') },
  { value: 'out_of_service', label: t('equipment.status.out_of_service') },
  { value: 'retired', label: t('equipment.status.retired') },
])

function statusVariant(status: string): 'success' | 'info' | 'warning' | 'neutral' {
  if (status === 'operational') return 'success'
  if (status === 'in_maintenance') return 'info'
  if (status === 'out_of_service') return 'warning'
  return 'neutral'
}

function changeStatus(newStatus: string) {
  router.patch(`/boats/${props.boat.id}/engines/${props.engine.id}/status`, { status: newStatus }, { preserveScroll: true })
}

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

const eventsByYearMonth = computed(() => {
  const groups: Record<string, MaintenanceEventRow[]> = {}
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

function formatYear(iso: string): string {
  return new Date(iso).getFullYear().toString()
}
</script>

<template>
  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb :items="[
      { label: t('boats.show.breadcrumbFleet'), href: '/boats' },
      { label: boat.name, href: `/boats/${boat.id}` },
      { label: t('boats.engineShow.breadcrumb.equipment'), href: `/boats/${boat.id}/engine?tab=equipment` },
      { label: engineTitle },
    ]" />

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
            <p v-if="engine.manufacturedAt">{{ t('boats.engineShow.installedIn', {
              year:
                formatYear(engine.manufacturedAt) }) }}</p>
          </div>
          <div class="mt-3">
            <BaseSelect v-if="canManage" id="engine-status" name="status" :label="t('equipment.status.label')"
              :options="statusOptions" :model-value="engine.status" :errors="{}" class="w-48"
              @update:model-value="changeStatus" />
            <BaseBadge v-else :variant="statusVariant(engine.status)">
              {{ t(`equipment.status.${engine.status}`) }}
            </BaseBadge>
          </div>
        </div>

        <div v-if="canManage" class="flex flex-wrap items-center gap-2 justify-end">
          <BaseButton variant="secondary" size="sm" :href="`/boats/${boat.id}/engines/${engine.id}/edit`">
            {{ t('boats.engineShow.actions.edit') }}
          </BaseButton>
          <BaseButton size="sm" @click="addEventOpen = true">
            {{ t('boats.engineShow.actions.addEvent') }}
          </BaseButton>
        </div>
      </div>

      <BaseTabs v-model="tab" :tabs="[
        { key: 'overview', label: t('boats.engineShow.tabs.overview') },
        { key: 'specs', label: t('boats.engineShow.tabs.specs') },
        { key: 'maintenance', label: t('boats.engineShow.tabs.maintenance'), badge: String(openTasks.length) },
        { key: 'notes', label: t('boats.engineShow.tabs.notes') },
        { key: 'parts', label: t('boats.engineShow.tabs.parts') },
        { key: 'documents', label: t('boats.engineShow.tabs.documents') },
      ]" />
    </header>

    <Transition name="tab" mode="out-in">
      <div :key="tab" class="mt-8">
        <EngineShowTabOverview v-if="tab === 'overview'" :engine="engine" :overdue-task="overdueTask"
          :recent-events="recentEvents" :hours-since-last-maint="hoursSinceLastMaint"
          :nearest-threshold="nearestThreshold" :hours-progress="hoursProgress" :is-over-threshold="isOverThreshold"
          :sorted-open-tasks="sortedOpenTasks" />
        <EngineShowTabSpecs v-else-if="tab === 'specs'" :boat="boat" :engine="engine" :open-tasks="openTasks"
          :can-manage="canManage" />
        <EngineShowTabMaintenance v-else-if="tab === 'maintenance'" :boat="boat" :engine="engine"
          :maintenance-events="maintenanceEvents" :open-tasks="openTasks" :sorted-open-tasks="sortedOpenTasks"
          :total-parts="totalParts" :can-manage="canManage" :events-by-year-month="eventsByYearMonth" />
        <EngineShowTabNotes v-else-if="tab === 'notes'" :engine="engine" :boat="boat" :can-manage="canManage" />
        <EngineShowTabParts
          v-else-if="tab === 'parts'"
          :parts="engine.parts"
          :boat-id="boat.id"
          :engine-id="engine.id"
          :can-manage="canManage"
        />
        <EngineShowTabDocuments v-else-if="tab === 'documents'" :boat="boat" :engine="engine" :can-manage="canManage" />
      </div>
    </Transition>

    <EngineMaintenanceEventModal v-if="canManage" :boat="boat" :engine="engine" v-model:open="addEventOpen" />
  </div>
</template>
