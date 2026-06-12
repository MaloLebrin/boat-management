<script setup lang="ts">
import { computed } from 'vue'
import BoatPhotoGallery from '~/components/boats/show/BoatPhotoGallery.vue'
import BoatSimulatorCard from '~/components/boats/show/BoatSimulatorCard.vue'
import BoatOverdueAlert from './overview/BoatOverdueAlert.vue'
import BoatOverviewAiPanel from './overview/BoatOverviewAiPanel.vue'
import BoatOverviewKpiRow from './overview/BoatOverviewKpiRow.vue'
import BoatOverviewPositionCard from './overview/BoatOverviewPositionCard.vue'
import BoatOverviewRecentActivity from './overview/BoatOverviewRecentActivity.vue'
import BoatOverviewSpecsCard from './overview/BoatOverviewSpecsCard.vue'
import type {
  AiSuggestion,
  BoatShowDetail,
  MaintenanceEventRow,
  MaintenanceTaskRow,
} from '~/types/boat_show'

const props = defineProps<{
  boat: BoatShowDetail
  maintenanceTasks: MaintenanceTaskRow[]
  maintenanceEvents: MaintenanceEventRow[]
  canManage: boolean
  aiSuggestions: AiSuggestion[] | null
}>()

const emit = defineEmits<{ 'go-to-tab': [tab: string] }>()

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

const currentPositionLabel = computed(() => {
  if (props.boat.spot) {
    const parts: string[] = []
    if (props.boat.spot.portName) parts.push(props.boat.spot.portName)
    if (props.boat.spot.pontoonName) parts.push(props.boat.spot.pontoonName)
    if (props.boat.spot.mouillageNom) parts.push(props.boat.spot.mouillageNom)
    parts.push(props.boat.spot.name)
    return parts.join(' / ')
  }
  return props.boat.homePort ?? null
})
</script>

<template>
  <div class="flex flex-col gap-6 lg:flex-row">
    <div class="flex-1 space-y-6">
      <BoatPhotoGallery :boat="boat" :can-manage="canManage" />
      <BoatOverdueAlert :overdue-tasks="overdueTasks" @go-to-tab="emit('go-to-tab', $event)" />
      <BoatOverviewKpiRow
        :total-engine-hours="totalEngineHours"
        :engine-count="boat.engines.length"
        :last-maintenance-date="lastMaintenanceDate"
        :next-task-due-date="nextTaskDueDate"
        :today-iso="todayIso"
      />
      <BoatOverviewSpecsCard :boat="boat" @go-to-tab="emit('go-to-tab', $event)" />
      <BoatOverviewRecentActivity
        :recent-events="recentEvents"
        @go-to-tab="emit('go-to-tab', $event)"
      />
    </div>

    <div class="w-full space-y-6 lg:w-72">
      <BoatOverviewAiPanel :boat-id="boat.id" :ai-suggestions="aiSuggestions" />
      <BoatOverviewPositionCard :position-label="currentPositionLabel" />
      <BoatSimulatorCard :boat-id="boat.id" />
    </div>
  </div>
</template>
