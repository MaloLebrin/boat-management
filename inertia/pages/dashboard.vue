<script setup lang="ts">
import { AdjustmentsHorizontalIcon } from '@heroicons/vue/24/outline'
import { Head } from '@inertiajs/vue3'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import DashboardAddWidgetModal from '~/components/dashboard/DashboardAddWidgetModal.vue'
import DashboardEditToolbar from '~/components/dashboard/DashboardEditToolbar.vue'
import DashboardHeader from '~/components/dashboard/DashboardHeader.vue'
import DashboardQuickAddActions from '~/components/dashboard/DashboardQuickAddActions.vue'
import DashboardStatsGrid from '~/components/dashboard/DashboardStatsGrid.vue'
import DashboardWidgetColumn from '~/components/dashboard/DashboardWidgetColumn.vue'
import DashboardWidgetFrame from '~/components/dashboard/DashboardWidgetFrame.vue'
import type { DashboardWidgetZone } from '#shared/constants/dashboard_widgets'
import { visibleWidgets } from '#shared/helpers/dashboard_layout'
import { useDashboardLayout } from '~/composables/use_dashboard_layout'
import { useT } from '~/composables/use_t'
import type { DashboardPageProps } from '~/types/dashboard_widgets'

const { t } = useT()

const props = defineProps<DashboardPageProps>()

// Disposition par utilisateur : la page ne fait qu'orchestrer les widgets
// visibles dans l'ordre servi par `layout` ; la disponibilité (rôle, plan,
// modules) est déjà tranchée côté serveur. En édition (façon iOS), le rendu
// suit le brouillon local : retraits, ajouts et déplacements s'appliquent
// immédiatement, « Terminé » enregistre en une requête.
const {
  isEditing,
  isSaving,
  isDirty,
  isCustomized,
  addable,
  canAdd,
  visibleDraft,
  remove,
  add,
  move,
  reset,
  startEditing,
  cancelEditing,
  finishEditing,
} = useDashboardLayout(() => props.layout)

function widgetsOf(zone: DashboardWidgetZone) {
  return isEditing.value ? visibleDraft(zone) : visibleWidgets(props.layout, zone)
}
const kpisVisible = computed(() => widgetsOf('top').includes('kpis'))
const mainWidgets = computed(() => widgetsOf('main'))
const sideWidgets = computed(() => widgetsOf('side'))
const hiddenCount = computed(() => props.layout.hidden.length)

const addOpen = ref(false)

// Échap quitte l'édition sans enregistrer (comme « Annuler »), sauf quand la
// galerie est ouverte : c'est alors sa propre fermeture qui prime.
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isEditing.value && !addOpen.value) cancelEditing()
}
onMounted(() => window.addEventListener('keydown', onKeyDown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))
</script>

<template>
  <Head :title="t('dashboard.title')" />

  <!-- Hiérarchie (#828) : en-tête → KPI compacts → colonne principale (ce
       qu'il y a à faire, puis la flotte) + colonne latérale (assistant IA,
       ports…). Sous xl tout s'empile dans cet ordre. Chaque utilisateur peut
       retirer, réajouter et réordonner les widgets en place (« Personnaliser »). -->
  <div class="w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
    <DashboardHeader>
      <template #actions>
        <DashboardEditToolbar
          v-if="isEditing"
          :can-add="canAdd"
          :is-dirty="isDirty"
          :is-saving="isSaving"
          :is-customized="isCustomized"
          @add="addOpen = true"
          @reset="reset()"
          @cancel="cancelEditing"
          @done="finishEditing"
        />
        <template v-else>
          <BaseButton
            variant="outline"
            size="sm"
            data-testid="dashboard-customize"
            :aria-label="t('dashboard.customize.button')"
            @click="startEditing"
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
      </template>
    </DashboardHeader>

    <p
      v-if="isEditing"
      class="mt-3 text-sm text-fg-muted"
      role="status"
      data-testid="dashboard-editing-hint"
    >
      {{ t('dashboard.customize.editingHint') }}
    </p>

    <DashboardWidgetFrame
      v-if="kpisVisible"
      id="kpis"
      class="mt-6 sm:mt-8"
      :editing="isEditing"
      :reorderable="false"
      :can-move-up="false"
      :can-move-down="false"
      @remove="remove('kpis')"
    >
      <DashboardStatsGrid
        :class="{ 'mt-6 sm:mt-8': !isEditing }"
        :stats="stats"
        :pulse="pulse"
        :fleet-status="fleetStatus"
        :counts="attention.counts"
      />
    </DashboardWidgetFrame>

    <!-- Deux colonnes à partir de `xl` seulement : entre 1024 et 1279 px la
         colonne 2fr (~450 px) tronquait la table bateaux et les noms de port.
         `xl:items-start` : sans lui la grille étire la colonne latérale (panneau
         Assistant IA navy) sur toute la hauteur de la colonne principale. -->
    <div
      class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:items-start"
    >
      <DashboardWidgetColumn
        zone="main"
        :widgets="mainWidgets"
        :data="props"
        :editing="isEditing"
        data-testid="dashboard-main-column"
        @remove="remove"
        @move="(id, direction) => move('main', id, direction)"
      />
      <DashboardWidgetColumn
        zone="side"
        :widgets="sideWidgets"
        :data="props"
        :editing="isEditing"
        data-testid="dashboard-side-column"
        @remove="remove"
        @move="(id, direction) => move('side', id, direction)"
      />
    </div>

    <DashboardAddWidgetModal v-model:open="addOpen" :addable="addable" @add="add" />
  </div>
</template>
