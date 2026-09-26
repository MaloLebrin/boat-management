<script setup lang="ts">
import { computed, ref } from 'vue'
import { Link } from '@adonisjs/inertia/vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import DashboardActiveTripRow from '~/components/dashboard/DashboardActiveTripRow.vue'
import QuickAddNavigationLogModal from '~/components/navigation/QuickAddNavigationLogModal.vue'
import type {
  DashboardActiveTrips,
  DashboardBoatSummary,
  DashboardFleetStatus,
} from '#shared/types/dashboard'
import type { NavigationLogPortOption } from '~/types/boat_show'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  activeTrips: DashboardActiveTrips
  fleetStatus: DashboardFleetStatus
  boats: DashboardBoatSummary[]
  portOptions: NavigationLogPortOption[]
  canCreateNavigationLogs: boolean
}>()

const { t } = useT()

const remaining = computed(() =>
  Math.max(props.activeTrips.total - props.activeTrips.items.length, 0)
)
const boatOptions = computed(() => props.boats.map((b) => ({ id: b.id, name: b.name })))
const canLogTrip = computed(() => props.canCreateNavigationLogs && props.boats.length > 0)

// La modale est la même que celle du menu « + Créer » : deux instances
// indépendantes, comme les modales vivent déjà hors du panneau du menu.
const modalOpen = ref(false)
</script>

<template>
  <BaseCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 class="text-sm font-semibold text-fg">
          {{ t('dashboard.atSea.title') }}
          <span v-if="activeTrips.total > 0" class="text-fg-muted">· {{ activeTrips.total }}</span>
        </h2>
        <Link
          href="/navigation/logbook"
          data-testid="dashboard-at-sea-view-all"
          class="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline"
        >
          {{ t('dashboard.atSea.viewAll') }}
        </Link>
      </div>
      <p class="mt-1 text-xs font-medium text-fg-muted" data-testid="dashboard-fleet-status">
        {{
          t('dashboard.atSea.status', {
            atSea: String(fleetStatus.atSea),
            inPort: String(fleetStatus.inPort),
            engines: String(fleetStatus.enginesInMaintenance),
          })
        }}
      </p>
    </template>

    <div v-if="activeTrips.items.length === 0" class="space-y-3">
      <p class="text-sm text-fg-muted">{{ t('dashboard.atSea.empty') }}</p>
      <BaseButton
        v-if="canLogTrip"
        variant="secondary"
        size="sm"
        data-testid="dashboard-at-sea-cta"
        @click="modalOpen = true"
      >
        {{ t('dashboard.atSea.emptyCta') }}
      </BaseButton>
    </div>

    <ul v-else class="space-y-3 text-sm">
      <DashboardActiveTripRow v-for="trip in activeTrips.items" :key="trip.id" :trip="trip" />
    </ul>

    <template v-if="remaining > 0" #footer>
      <Link
        href="/navigation/logbook"
        class="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand hover:underline"
      >
        {{ t('dashboard.atSea.viewMore', { count: String(remaining) }) }}
        <span aria-hidden="true">&rarr;</span>
      </Link>
    </template>
  </BaseCard>

  <QuickAddNavigationLogModal
    v-if="canLogTrip"
    v-model:open="modalOpen"
    :boats="boatOptions"
    :port-options="portOptions"
  />
</template>
