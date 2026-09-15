<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import QuickAddIncidentModal from '~/components/navigation/QuickAddIncidentModal.vue'
import QuickAddNavigationLogModal from '~/components/navigation/QuickAddNavigationLogModal.vue'
import QuickAddMaintenanceTaskModal from '~/components/dashboard/QuickAddMaintenanceTaskModal.vue'
import { useT } from '~/composables/use_t'
import type { NavigationLogPortOption } from '~/types/boat_show'
import type { DashboardBoatSummary } from '#shared/types/dashboard'
import type { BoatTaskEquipment } from '#shared/types/maintenance'

const props = defineProps<{
  boats: DashboardBoatSummary[]
  portOptions: NavigationLogPortOption[]
  canCreateNavigationLogs: boolean
  canCreateIncidents: boolean
  canCreateMaintenanceTasks: boolean
  taskEquipment?: BoatTaskEquipment
}>()

const { t } = useT()

const fleetBoatOptions = computed(() => props.boats.map((b) => ({ id: b.id, name: b.name })))

const showQuickAddLogbook = ref(false)
const showQuickAddIncident = ref(false)
const taskModal = ref<InstanceType<typeof QuickAddMaintenanceTaskModal> | null>(null)
</script>

<template>
  <BaseButton
    v-if="canCreateNavigationLogs && boats.length > 0"
    variant="secondary"
    @click="showQuickAddLogbook = true"
  >
    {{ t('dashboard.quickAdd.logbook') }}
  </BaseButton>
  <BaseButton
    v-if="canCreateIncidents && boats.length > 0"
    variant="secondary"
    @click="showQuickAddIncident = true"
  >
    {{ t('dashboard.quickAdd.incident') }}
  </BaseButton>
  <BaseButton
    v-if="canCreateMaintenanceTasks && boats.length > 0"
    variant="secondary"
    data-testid="dashboard-quick-add-task"
    @click="taskModal?.openModal()"
  >
    {{ t('dashboard.quickAdd.task') }}
  </BaseButton>

  <QuickAddNavigationLogModal
    v-model:open="showQuickAddLogbook"
    :boats="fleetBoatOptions"
    :port-options="portOptions"
    :default-boat-id="null"
  />
  <QuickAddIncidentModal
    v-model:open="showQuickAddIncident"
    :boats="fleetBoatOptions"
    :default-boat-id="null"
  />
  <QuickAddMaintenanceTaskModal
    v-if="canCreateMaintenanceTasks"
    ref="taskModal"
    :boats="fleetBoatOptions"
    :task-equipment="taskEquipment"
  />
</template>
