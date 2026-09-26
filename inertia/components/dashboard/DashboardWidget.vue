<script setup lang="ts">
import DashboardActivityCard from '~/components/dashboard/DashboardActivityCard.vue'
import DashboardAiPanel from '~/components/dashboard/DashboardAiPanel.vue'
import DashboardAtSeaCard from '~/components/dashboard/DashboardAtSeaCard.vue'
import DashboardAttentionCard from '~/components/dashboard/DashboardAttentionCard.vue'
import DashboardBoatsCard from '~/components/dashboard/DashboardBoatsCard.vue'
import DashboardNotificationsCard from '~/components/dashboard/DashboardNotificationsCard.vue'
import DashboardPlannedTasksCard from '~/components/dashboard/DashboardPlannedTasksCard.vue'
import DashboardSpendCard from '~/components/dashboard/DashboardSpendCard.vue'
import DashboardUpcomingReservationsCard from '~/components/dashboard/DashboardUpcomingReservationsCard.vue'
import PortDashboardCard from '~/components/dashboard/PortDashboardCard.vue'
import type { DashboardWidgetId } from '#shared/constants/dashboard_widgets'
import type { DashboardWidgetData } from '~/types/dashboard_widgets'

/**
 * Widget → carte. Des branches explicites plutôt qu'un `<component :is>` :
 * chaque carte garde ses props typées, et un id sans branche est une erreur
 * visible à la relecture. Les KPI (zone `top`) sont rendus par la page.
 */
defineProps<{
  id: DashboardWidgetId
  data: DashboardWidgetData
}>()
</script>

<template>
  <DashboardAttentionCard v-if="id === 'attention'" :attention="data.attention" />
  <DashboardAtSeaCard
    v-else-if="id === 'at_sea'"
    :active-trips="data.activeTrips"
    :fleet-status="data.fleetStatus"
    :boats="data.boats"
    :port-options="data.portOptions"
    :can-create-navigation-logs="data.canCreateNavigationLogs"
  />
  <DashboardUpcomingReservationsCard
    v-else-if="id === 'upcoming_reservations' && data.upcomingReservations"
    :items="data.upcomingReservations"
  />
  <DashboardActivityCard v-else-if="id === 'activity'" :items="data.activity" />
  <DashboardBoatsCard v-else-if="id === 'boats'" :boats="data.boats" />
  <DashboardAiPanel
    v-else-if="id === 'ai_panel'"
    :ai-fleet-analysis="data.aiFleetAnalysis"
    :ai-fleet-analysis-at="data.aiFleetAnalysisAt"
  />
  <DashboardSpendCard v-else-if="id === 'spend'" :spend="data.spend" />
  <PortDashboardCard v-else-if="id === 'ports'" :ports="data.ports" :port-stats="data.portStats" />
  <DashboardPlannedTasksCard
    v-else-if="id === 'planned_tasks'"
    :planned-tasks="data.plannedTasks"
  />
  <DashboardNotificationsCard v-else-if="id === 'notifications'" />
</template>
