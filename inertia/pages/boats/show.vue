<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import BoatShowTabContent from '~/components/boats/show/BoatShowTabContent.vue'
import { useT } from '~/composables/use_t'
import type {
  AiSuggestion,
  BoatIncidentRow,
  BoatDocumentRow,
  BoatShowDetail,
  FuelLogRow,
  MaintenanceEventRow,
  MaintenanceSheetRow,
  MaintenanceTaskRow,
  NavigationLogRow,
  NavigationLogPortOption,
} from '~/types/boat_show'
import type { CrewMemberOption } from '../../../shared/types/crew'

const { t } = useT()

const props = defineProps<{
  boat: BoatShowDetail
  maintenanceEvents: MaintenanceEventRow[]
  maintenanceTasks: MaintenanceTaskRow[]
  maintenanceSheets: MaintenanceSheetRow[]
  incidents: BoatIncidentRow[]
  fuelLogs: FuelLogRow[]
  navigationLogs: NavigationLogRow[]
  portOptions: NavigationLogPortOption[]
  crewMemberOptions: CrewMemberOption[]
  boatDocuments: BoatDocumentRow[]
  canManageMaintenance: boolean
  canManageEquipment: boolean
  canManageDocuments: boolean
  canExport: boolean
  canDeleteIncidents: boolean
  canCreateFuelLogs: boolean
  canDeleteFuelLogs: boolean
  canCreateNavigationLogs: boolean
  canUpdateNavigationLogs: boolean
  canDeleteNavigationLogs: boolean
  aiSuggestions: AiSuggestion[] | null
}>()

type TabKey =
  | 'overview'
  | 'specs'
  | 'equipment'
  | 'history'
  | 'tasks'
  | 'documents'
  | 'sheets'
  | 'incidents'
  | 'fuel'
  | 'navigation-logs'
  | 'admin-docs'

const tab = ref<TabKey>('overview')

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const fromUrl = urlParams.get('tab') as TabKey | null
  if (fromUrl) tab.value = fromUrl
})

watch(tab, (newTab) => {
  const url = new URL(window.location.href)
  if (newTab === 'overview') {
    url.searchParams.delete('tab')
  } else {
    url.searchParams.set('tab', newTab)
  }
  // On met à jour l'URL sans déclencher de requête Inertia
  window.history.replaceState(window.history.state, '', url.pathname + url.search)
})

const createTaskNonce = ref(0)
const createEventNonce = ref(0)

const todayIso = computed(() => new Date().toISOString().slice(0, 10))

const openTasks = computed(() => props.maintenanceTasks.filter((task) => task.status === 'open'))

const overdueTasks = computed(() =>
  openTasks.value.filter((task) => task.dueAt && String(task.dueAt) <= todayIso.value)
)

const statusBadge = computed(() => {
  if (overdueTasks.value.length > 0)
    return { variant: 'warning' as const, label: t('boats.show.status.urgent') }
  if (openTasks.value.length > 0)
    return { variant: 'info' as const, label: t('boats.show.status.upcoming') }
  return { variant: 'success' as const, label: t('boats.show.status.ok') }
})

const openIncidents = computed(() =>
  props.incidents.filter((i) => i.status === 'open' || i.status === 'in_progress')
)

const expiringDocCount = computed(
  () =>
    props.boatDocuments.filter((d) => d.status === 'expiring_soon' || d.status === 'expired').length
)

const tabs = computed(() => [
  { key: 'overview', label: t('boats.show.tabs.overview') },
  { key: 'specs', label: t('boats.show.tabs.specs') },
  { key: 'equipment', label: t('boats.show.tabs.equipment') },
  { key: 'history', label: t('boats.show.tabs.history') },
  {
    key: 'tasks',
    label: t('boats.show.tabs.tasks'),
    badge: openTasks.value.length > 0 ? String(openTasks.value.length) : undefined,
  },
  { key: 'sheets', label: t('boats.show.tabs.sheets') },
  { key: 'documents', label: t('boats.show.tabs.documents') },
  {
    key: 'incidents',
    label: t('incidents.tab'),
    badge: openIncidents.value.length > 0 ? String(openIncidents.value.length) : undefined,
  },
  { key: 'fuel', label: t('fuel_logs.tab') },
  { key: 'navigation-logs', label: t('navigation_logs.tab') },
  {
    key: 'admin-docs',
    label: t('boats.show.tabs.adminDocs'),
    badge: expiringDocCount.value > 0 ? String(expiringDocCount.value) : undefined,
  },
])

function goToTab(key: TabKey | string) {
  tab.value = key as TabKey
}

function openHistoryTab() {
  goToTab('history')
  createEventNonce.value++
}

function openTasksTab() {
  goToTab('tasks')
  createTaskNonce.value++
}
</script>

<template>
  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb
      :items="[
        { label: t('boats.show.breadcrumbFleet'), href: '/boats' },
        { label: t('nav.boats') },
        { label: boat.name },
      ]"
    />

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
            <span
              v-if="(boat.type || boat.registrationNumber) && boat.propulsionType"
              class="text-fg-subtle"
              >·</span
            >
            <span v-if="boat.propulsionType">{{ boat.propulsionType }}</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 justify-end">
          <a :href="`/boats/${boat.id}/edit`">
            <BaseButton variant="secondary" size="sm">{{ t('boats.show.editBoat') }}</BaseButton>
          </a>
          <BaseButton
            v-if="canManageMaintenance"
            variant="secondary"
            size="sm"
            type="button"
            @click="openHistoryTab"
          >
            + {{ t('boats.show.addEntry') }}
          </BaseButton>
          <BaseButton
            v-if="canManageMaintenance"
            variant="primary"
            size="sm"
            type="button"
            @click="openTasksTab"
          >
            + {{ t('boats.show.addTask') }}
          </BaseButton>
          <a
            v-if="canExport"
            :href="`/boats/${boat.id}/maintenance-log.pdf`"
            target="_blank"
            rel="noopener"
          >
            <BaseButton variant="secondary" size="sm" type="button">
              {{ t('boats.maintenanceLog.download') }}
            </BaseButton>
          </a>
        </div>
      </div>

      <!-- Tab bar -->
      <BaseTabs v-model="tab" :tabs="tabs" />
    </header>

    <BoatShowTabContent
      :tab="tab"
      v-bind="props"
      :create-event-nonce="createEventNonce"
      :create-task-nonce="createTaskNonce"
      @go-to-tab="goToTab"
    />
  </div>
</template>
