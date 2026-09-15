<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import {
  BookOpenIcon,
  ExclamationTriangleIcon,
  LifebuoyIcon,
  PlusIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/vue/24/outline'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseDropdown from '~/components/base/BaseDropdown.vue'
import UpgradePlanModal from '~/components/base/UpgradePlanModal.vue'
import QuickAddIncidentModal from '~/components/navigation/QuickAddIncidentModal.vue'
import QuickAddNavigationLogModal from '~/components/navigation/QuickAddNavigationLogModal.vue'
import QuickAddMaintenanceTaskModal from '~/components/dashboard/QuickAddMaintenanceTaskModal.vue'
import { useT } from '~/composables/use_t'
import type { NavigationLogPortOption } from '~/types/boat_show'
import type { DashboardBoatSummary } from '#shared/types/dashboard'
import type { BoatTaskEquipment } from '#shared/types/maintenance'
import type { QuotaUsage } from '#shared/types/plan'

const props = defineProps<{
  boats: DashboardBoatSummary[]
  portOptions: NavigationLogPortOption[]
  canCreateNavigationLogs: boolean
  canCreateIncidents: boolean
  canCreateMaintenanceTasks: boolean
  canAddBoat: boolean
  boatQuota: QuotaUsage['boats']
  taskEquipment?: BoatTaskEquipment
}>()

const { t } = useT()

const fleetBoatOptions = computed(() => props.boats.map((b) => ({ id: b.id, name: b.name })))

// Les actions rapides (sortie, incident, tâche) n'ont de sens qu'avec au moins
// un bateau ; l'item « Un bateau » est toujours proposé, le menu l'est donc aussi.
const hasFleet = computed(() => props.boats.length > 0)

// Plan Entreprise (limit === null) : quota illimité, pas de badge « x/y ».
const showQuotaBadge = computed(() => props.boatQuota.limit !== null)
const quotaLabel = computed(() => `${props.boatQuota.used}/${props.boatQuota.limit}`)

const showQuickAddLogbook = ref(false)
const showQuickAddIncident = ref(false)
const showUpgradeModal = ref(false)
const taskModal = ref<InstanceType<typeof QuickAddMaintenanceTaskModal> | null>(null)

function createBoat() {
  if (props.canAddBoat) {
    router.visit('/boats/new')
  } else {
    // Au quota : l'item reste cliquable mais ouvre l'upsell plutôt que d'échouer
    // sur un toast éphémère après une redirection (issue #418).
    showUpgradeModal.value = true
  }
}

const menuItemClass =
  'inline-flex w-full items-center gap-2 rounded-(--radius-control) px-3 py-2 text-left text-sm font-semibold text-fg-muted transition-colors duration-(--motion-fast) ease-premium hover:bg-surface-muted hover:text-fg'
</script>

<template>
  <!-- Ancré au bord droit de l'en-tête : le panneau s'ouvre vers la gauche pour rester dans la page. -->
  <BaseDropdown variant="primary" align="right">
    <template #trigger>
      <PlusIcon class="h-4 w-4" aria-hidden="true" />
      <span aria-hidden="true">{{ t('dashboard.quickAdd.menuLabel') }}</span>
      <span class="sr-only">{{ t('dashboard.quickAdd.menuAria') }}</span>
    </template>
    <template #default="{ close }">
      <button
        type="button"
        role="menuitem"
        :class="menuItemClass"
        :title="canAddBoat ? undefined : t('boats.index.quotaReached')"
        data-testid="dashboard-quick-add-boat"
        @click="(createBoat(), close())"
      >
        <LifebuoyIcon class="h-4 w-4 text-fg-subtle" aria-hidden="true" />
        {{ t('dashboard.quickAdd.boat') }}
        <BaseBadge
          v-if="showQuotaBadge"
          :variant="canAddBoat ? 'neutral' : 'warning'"
          class="ml-auto"
        >
          {{ quotaLabel }}
        </BaseBadge>
      </button>
      <button
        v-if="hasFleet && canCreateNavigationLogs"
        type="button"
        role="menuitem"
        :class="menuItemClass"
        @click="((showQuickAddLogbook = true), close())"
      >
        <BookOpenIcon class="h-4 w-4 text-fg-subtle" aria-hidden="true" />
        {{ t('dashboard.quickAdd.logbook') }}
      </button>
      <button
        v-if="hasFleet && canCreateIncidents"
        type="button"
        role="menuitem"
        :class="menuItemClass"
        @click="((showQuickAddIncident = true), close())"
      >
        <ExclamationTriangleIcon class="h-4 w-4 text-fg-subtle" aria-hidden="true" />
        {{ t('dashboard.quickAdd.incident') }}
      </button>
      <button
        v-if="hasFleet && canCreateMaintenanceTasks"
        type="button"
        role="menuitem"
        :class="menuItemClass"
        data-testid="dashboard-quick-add-task"
        @click="(taskModal?.openModal(), close())"
      >
        <WrenchScrewdriverIcon class="h-4 w-4 text-fg-subtle" aria-hidden="true" />
        {{ t('dashboard.quickAdd.task') }}
      </button>
    </template>
  </BaseDropdown>

  <!-- Les modales vivent hors du panneau du menu : celui-ci est démonté à la fermeture. -->
  <UpgradePlanModal v-model:open="showUpgradeModal" feature="boats" />
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
