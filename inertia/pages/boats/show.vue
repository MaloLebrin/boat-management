<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import BoatShowTabDocuments from '~/components/boats/show/tabs/BoatShowTabDocuments.vue'
import BoatShowTabEquipment from '~/components/boats/show/tabs/BoatShowTabEquipment.vue'
import BoatShowTabHistory from '~/components/boats/show/tabs/BoatShowTabHistory.vue'
import BoatShowTabOverview from '~/components/boats/show/tabs/BoatShowTabOverview.vue'
import BoatShowTabSpecs from '~/components/boats/show/tabs/BoatShowTabSpecs.vue'
import BoatShowTabTasks from '~/components/boats/show/tabs/BoatShowTabTasks.vue'
import { useT } from '~/composables/useT'
import type { BoatShowDetail, MaintenanceEventRow, MaintenanceTaskRow } from '~/types/boat_show'

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
const createEventNonce = ref(0)

const todayIso = computed(() => new Date().toISOString().slice(0, 10))

const openTasks = computed(() => props.maintenanceTasks.filter((task) => task.status === 'open'))

const overdueTasks = computed(() =>
  openTasks.value.filter((task) => task.dueAt && String(task.dueAt) <= todayIso.value)
)

const statusBadge = computed(() => {
  if (overdueTasks.value.length > 0) return { variant: 'warning' as const, label: t('boats.show.status.urgent') }
  if (openTasks.value.length > 0) return { variant: 'info' as const, label: t('boats.show.status.upcoming') }
  return { variant: 'success' as const, label: t('boats.show.status.ok') }
})

const tabs = computed(() => [
  { key: 'overview', label: "Vue d'ensemble" },
  { key: 'specs', label: 'Specifications' },
  { key: 'equipment', label: 'Equipements' },
  { key: 'history', label: 'Historique' },
  { key: 'tasks', label: 'Taches', badge: openTasks.value.length > 0 ? String(openTasks.value.length) : undefined },
  { key: 'documents', label: 'Documents' },
])

function goToTab(key: TabKey | string) {
  tab.value = key as TabKey
}
</script>

<template>
  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb :items="[{ label: 'Flotte', href: '/boats' }, { label: 'Bateaux' }, { label: boat.name }]" />

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
          <BaseButton v-if="canManageMaintenance" variant="secondary" size="sm" type="button"
            @click="goToTab('history'); createEventNonce++">
            + Evenement
          </BaseButton>
          <BaseButton v-if="canManageMaintenance" variant="primary" size="sm" type="button"
            @click="goToTab('tasks'); createTaskNonce++">
            + Tache
          </BaseButton>
        </div>
      </div>

      <!-- Tab bar -->
      <BaseTabs v-model="tab" :tabs="tabs" />
    </header>

    <div class="mt-8">
      <BoatShowTabOverview
        v-if="tab === 'overview'"
        :boat="boat"
        :maintenance-tasks="maintenanceTasks"
        :maintenance-events="maintenanceEvents"
        @go-to-tab="goToTab"
      />

      <BoatShowTabSpecs v-else-if="tab === 'specs'" :boat="boat" />

      <BoatShowTabEquipment
        v-else-if="tab === 'equipment'"
        :boat="boat"
        :can-manage-equipment="canManageEquipment"
      />

      <BoatShowTabHistory
        v-else-if="tab === 'history'"
        :boat="boat"
        :maintenance-events="maintenanceEvents"
        :can-manage-maintenance="canManageMaintenance"
        :create-event-nonce="createEventNonce"
      />

      <BoatShowTabTasks
        v-else-if="tab === 'tasks'"
        :boat="boat"
        :maintenance-tasks="maintenanceTasks"
        :can-manage-maintenance="canManageMaintenance"
        :create-task-nonce="createTaskNonce"
      />

      <BoatShowTabDocuments v-else-if="tab === 'documents'" :boat="boat" />
    </div>
  </div>
</template>
