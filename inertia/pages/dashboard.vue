<script setup lang="ts">
import { AdjustmentsHorizontalIcon } from '@heroicons/vue/24/outline'
import { Head } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import DashboardCustomizeModal from '~/components/dashboard/DashboardCustomizeModal.vue'
import DashboardHeader from '~/components/dashboard/DashboardHeader.vue'
import DashboardQuickAddActions from '~/components/dashboard/DashboardQuickAddActions.vue'
import DashboardStatsGrid from '~/components/dashboard/DashboardStatsGrid.vue'
import DashboardWidgetColumn from '~/components/dashboard/DashboardWidgetColumn.vue'
import { visibleWidgets } from '#shared/helpers/dashboard_layout'
import { useT } from '~/composables/use_t'
import type { DashboardPageProps } from '~/types/dashboard_widgets'

const { t } = useT()

const props = defineProps<DashboardPageProps>()

// Disposition par utilisateur : la page ne fait qu'orchestrer les widgets
// visibles dans l'ordre servi par `layout` ; la disponibilité (rôle, plan,
// modules) est déjà tranchée côté serveur.
const kpisVisible = computed(() => visibleWidgets(props.layout, 'top').includes('kpis'))
const mainWidgets = computed(() => visibleWidgets(props.layout, 'main'))
const sideWidgets = computed(() => visibleWidgets(props.layout, 'side'))
const hiddenCount = computed(() => props.layout.hidden.length)

const customizeOpen = ref(false)
</script>

<template>
  <Head :title="t('dashboard.title')" />

  <!-- Hiérarchie (#828) : en-tête → KPI compacts → colonne principale (ce
       qu'il y a à faire, puis la flotte) + colonne latérale (assistant IA,
       ports…). Sous xl tout s'empile dans cet ordre. Chaque utilisateur peut
       masquer et réordonner les widgets de chaque colonne (« Personnaliser »). -->
  <div class="w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
    <DashboardHeader>
      <template #actions>
        <BaseButton
          variant="outline"
          size="sm"
          data-testid="dashboard-customize"
          :aria-label="t('dashboard.customize.button')"
          @click="customizeOpen = true"
        >
          <AdjustmentsHorizontalIcon class="h-4 w-4" aria-hidden="true" />
          <span class="hidden sm:inline">{{ t('dashboard.customize.button') }}</span>
          <span
            v-if="hiddenCount > 0"
            class="rounded-full bg-surface-muted px-1.5 text-xs text-fg-muted"
            data-testid="dashboard-hidden-count"
          >
            {{ t('dashboard.customize.hiddenCount', { count: String(hiddenCount) }) }}
          </span>
        </BaseButton>
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

    <DashboardStatsGrid
      v-if="kpisVisible"
      class="mt-6 sm:mt-8"
      :stats="stats"
      :pulse="pulse"
      :fleet-status="fleetStatus"
      :counts="attention.counts"
    />

    <!-- Deux colonnes à partir de `xl` seulement : entre 1024 et 1279 px la
         colonne 2fr (~450 px) tronquait la table bateaux et les noms de port.
         `xl:items-start` : sans lui la grille étire la colonne latérale (panneau
         Assistant IA navy) sur toute la hauteur de la colonne principale. -->
    <div
      class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:items-start"
    >
      <DashboardWidgetColumn
        :widgets="mainWidgets"
        :data="props"
        data-testid="dashboard-main-column"
      />
      <DashboardWidgetColumn
        :widgets="sideWidgets"
        :data="props"
        data-testid="dashboard-side-column"
      />
    </div>

    <DashboardCustomizeModal v-model:open="customizeOpen" :layout="layout" />
  </div>
</template>
