<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { computed } from 'vue'
import DashboardAiPanel from '~/components/dashboard/DashboardAiPanel.vue'
import DashboardBoatsCard from '~/components/dashboard/DashboardBoatsCard.vue'
import DashboardHeader from '~/components/dashboard/DashboardHeader.vue'
import DashboardQuickAddActions from '~/components/dashboard/DashboardQuickAddActions.vue'
import DashboardStatsGrid from '~/components/dashboard/DashboardStatsGrid.vue'
import DashboardUrgentMaintenanceCard from '~/components/dashboard/DashboardUrgentMaintenanceCard.vue'
import PortDashboardCard from '~/components/dashboard/PortDashboardCard.vue'
import type {
  DashboardBoatSummary,
  DashboardPortItem,
  DashboardPortStats,
  DashboardStats,
  DashboardUrgentMaintenanceRow,
} from '#shared/types/dashboard'
import type { BoatTaskEquipment } from '#shared/types/maintenance'
import { useT } from '~/composables/use_t'
import { usePlan } from '~/composables/use_plan'
import type { AiSuggestion, NavigationLogPortOption } from '~/types/boat_show'
import type { QuotaUsage } from '../../shared/types/plan'

const { t } = useT()
const { effectiveQuotas } = usePlan()

const canManagePorts = computed(() => effectiveQuotas.value?.canManagePorts === true)

defineProps<{
  boats: DashboardBoatSummary[]
  urgentMaintenance: DashboardUrgentMaintenanceRow[]
  stats: DashboardStats
  aiFleetAnalysis: AiSuggestion[] | null
  ports: DashboardPortItem[]
  portStats: DashboardPortStats
  portOptions: NavigationLogPortOption[]
  canCreateNavigationLogs: boolean
  canCreateIncidents: boolean
  canCreateMaintenanceTasks: boolean
  /** Prop optionnelle, chargée par l'ajout rapide de tâche une fois le bateau choisi. */
  taskEquipment?: BoatTaskEquipment
  canAddBoat: boolean
  boatQuota: QuotaUsage['boats']
}>()
</script>

<template>
  <Head :title="t('dashboard.title')" />

  <!-- Hiérarchie (#828) : en-tête → KPI compacts → colonne principale (ce
       qu'il y a à faire, puis la flotte) + colonne latérale (assistant IA,
       ports). Sous xl tout s'empile dans cet ordre : l'IA passe avant les
       ports, qui étaient auparavant au-dessus de la maintenance urgente. -->
  <div class="w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
    <DashboardHeader>
      <template #actions>
        <DashboardQuickAddActions
          :boats="boats"
          :port-options="portOptions"
          :can-create-navigation-logs="canCreateNavigationLogs"
          :can-create-incidents="canCreateIncidents"
          :can-create-maintenance-tasks="canCreateMaintenanceTasks"
          :can-add-boat="canAddBoat"
          :boat-quota="boatQuota"
          :task-equipment="taskEquipment"
        />
      </template>
    </DashboardHeader>

    <DashboardStatsGrid class="mt-6 sm:mt-8" :stats="stats" />

    <!-- Deux colonnes à partir de `xl` seulement : entre 1024 et 1279 px la
         colonne 2fr (~450 px) tronquait la table bateaux et les noms de port.
         `xl:items-start` : sans lui la grille étire la colonne latérale (panneau
         Assistant IA navy) sur toute la hauteur de la colonne principale. -->
    <div
      class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:items-start"
    >
      <div class="space-y-6" data-testid="dashboard-main-column">
        <DashboardUrgentMaintenanceCard
          :rows="urgentMaintenance"
          :overdue-count="stats.deltas.overdueCount"
          :total="stats.urgentMaintenance"
        />
        <DashboardBoatsCard :boats="boats" />
      </div>

      <div class="space-y-6" data-testid="dashboard-side-column">
        <DashboardAiPanel :ai-fleet-analysis="aiFleetAnalysis" />
        <!-- Cartographie de port réservée aux plans Pro et Entreprise (#604) : sur
             Starter, l'état vide de la carte inviterait à créer un port inaccessible. -->
        <PortDashboardCard v-if="canManagePorts" :ports="ports" :port-stats="portStats" />
      </div>
    </div>
  </div>
</template>
