<script setup lang="ts">
import { computed } from 'vue'
import DashboardActivityCard from '~/components/dashboard/DashboardActivityCard.vue'
import DashboardAiPanel from '~/components/dashboard/DashboardAiPanel.vue'
import DashboardAtSeaCard from '~/components/dashboard/DashboardAtSeaCard.vue'
import DashboardAttentionCard from '~/components/dashboard/DashboardAttentionCard.vue'
import DashboardBoatsCard from '~/components/dashboard/DashboardBoatsCard.vue'
import DashboardNotificationsCard from '~/components/dashboard/DashboardNotificationsCard.vue'
import DashboardPlannedTasksCard from '~/components/dashboard/DashboardPlannedTasksCard.vue'
import DashboardSpendCard from '~/components/dashboard/DashboardSpendCard.vue'
import DashboardUpcomingReservationsCard from '~/components/dashboard/DashboardUpcomingReservationsCard.vue'
import DashboardWidgetPlaceholder from '~/components/dashboard/DashboardWidgetPlaceholder.vue'
import PortDashboardCard from '~/components/dashboard/PortDashboardCard.vue'
import type { DashboardWidgetId } from '#shared/constants/dashboard_widgets'
import type { DashboardWidgetData } from '~/types/dashboard_widgets'

/**
 * Widget → carte. Des branches explicites plutôt qu'un `<component :is>` :
 * chaque carte garde ses props typées, et un id sans branche est une erreur
 * visible à la relecture. Les KPI (zone `top`) sont rendus par la page.
 */
const props = defineProps<{
  id: DashboardWidgetId
  data: DashboardWidgetData
  /** Mode édition : un widget réajouté dont la donnée est absente montre un tenant-lieu. */
  editing?: boolean
}>()

// Les props gardées ou différées d'un widget masqué sont **omises** par le
// serveur ; réajouté pendant l'édition, il n'a rien à montrer avant
// l'enregistrement (rechargement complet). Les cartes à squelette (`activity`,
// `spend`, `plannedTasks`) sauraient afficher `undefined`, mais un squelette
// qui ne se résout jamais tromperait l'utilisateur : tenant-lieu explicite.
const awaitingData = computed(() => {
  if (!props.editing) return false
  switch (props.id) {
    case 'upcoming_reservations':
      return props.data.upcomingReservations === undefined
    case 'activity':
      return props.data.activity === undefined
    case 'spend':
      return props.data.spend === undefined
    case 'planned_tasks':
      return props.data.plannedTasks === undefined
    default:
      return false
  }
})
</script>

<template>
  <DashboardWidgetPlaceholder v-if="awaitingData" :id="id" />
  <DashboardAttentionCard v-else-if="id === 'attention'" :attention="data.attention" />
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
