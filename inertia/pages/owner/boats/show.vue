<script setup lang="ts">
import { computed, ref } from 'vue'
import { Link } from '@adonisjs/inertia/vue'
import { Head } from '@inertiajs/vue3'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import BoatOwnerMaintenanceTab from '~/components/owner/BoatOwnerMaintenanceTab.vue'
import BoatOwnerReservationsTab from '~/components/owner/BoatOwnerReservationsTab.vue'
import BoatOwnerInvoicesTab from '~/components/owner/BoatOwnerInvoicesTab.vue'
import OwnerDashboardTab from '~/components/owner/OwnerDashboardTab.vue'
import OwnerRequestsTab from '~/components/owner/OwnerRequestsTab.vue'
import OwnerDocumentsTab from '~/components/owner/OwnerDocumentsTab.vue'
import OwnerExpensesTab from '~/components/owner/OwnerExpensesTab.vue'
import OwnerIncidentsTab from '~/components/owner/OwnerIncidentsTab.vue'
import OwnerTripsTab from '~/components/owner/OwnerTripsTab.vue'
import { useT } from '~/composables/use_t'
import type { BoatOwnerBoatSummary } from '../../../../shared/types/boat'
import type { BoatOwnerMaintenanceEventRow } from '../../../../shared/types/maintenance'
import type { BoatReservationRow } from '~/types/reservation'
import type { InvoiceRow } from '../../../../shared/types/invoice'
import type {
  OwnerDashboard,
  OwnerDocumentRow,
  OwnerExpenseRow,
  OwnerIncidentRow,
  OwnerTaskRow,
  OwnerTripRow,
} from '#shared/types/owner_portal'

const props = defineProps<{
  boat: BoatOwnerBoatSummary
  dashboard: OwnerDashboard
  maintenanceEvents: BoatOwnerMaintenanceEventRow[]
  reservations: BoatReservationRow[]
  invoices: InvoiceRow[]
  documents: OwnerDocumentRow[]
  expenses: OwnerExpenseRow[]
  incidents: OwnerIncidentRow[]
  trips: OwnerTripRow[]
  requests: OwnerTaskRow[]
}>()

const { t } = useT()

const activeTab = ref('overview')
const tabs = computed(() => [
  { key: 'overview', label: t('owner.boats.show.tabs.overview') },
  {
    key: 'requests',
    label: t('owner.boats.show.tabs.requests'),
    badge: String(props.requests.length),
  },
  {
    key: 'maintenance',
    label: t('owner.boats.show.tabs.maintenance'),
    badge: String(props.maintenanceEvents.length),
  },
  {
    key: 'documents',
    label: t('owner.boats.show.tabs.documents'),
    badge: String(props.documents.length),
  },
  {
    key: 'expenses',
    label: t('owner.boats.show.tabs.expenses'),
    badge: String(props.expenses.length),
  },
  {
    key: 'incidents',
    label: t('owner.boats.show.tabs.incidents'),
    badge: String(props.incidents.length),
  },
  { key: 'trips', label: t('owner.boats.show.tabs.trips'), badge: String(props.trips.length) },
  {
    key: 'reservations',
    label: t('owner.boats.show.tabs.reservations'),
    badge: String(props.reservations.length),
  },
  {
    key: 'invoices',
    label: t('owner.boats.show.tabs.invoices'),
    badge: String(props.invoices.length),
  },
])
</script>

<template>
  <Head :title="boat.name" />

  <div class="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8">
    <nav class="mb-6 flex items-center gap-1.5 text-sm text-fg-muted">
      <Link href="/owner/boats" class="transition-colors hover:text-fg">
        {{ t('owner.boats.index.title') }}
      </Link>
      <span class="select-none">></span>
      <span class="font-medium text-fg">{{ boat.name }}</span>
    </nav>

    <BaseHeading level="1" class="mb-1">{{ boat.name }}</BaseHeading>
    <p v-if="boat.manufacturer || boat.model" class="mb-6 text-sm text-fg-muted">
      {{ [boat.manufacturer, boat.model].filter(Boolean).join(' ') }}
    </p>

    <BaseTabs v-model="activeTab" :tabs="tabs" class="mb-6" />

    <OwnerDashboardTab v-if="activeTab === 'overview'" :dashboard="dashboard" />
    <OwnerRequestsTab
      v-else-if="activeTab === 'requests'"
      :boat-id="boat.id"
      :requests="requests"
    />
    <BoatOwnerMaintenanceTab v-else-if="activeTab === 'maintenance'" :events="maintenanceEvents" />
    <OwnerDocumentsTab v-else-if="activeTab === 'documents'" :documents="documents" />
    <OwnerExpensesTab v-else-if="activeTab === 'expenses'" :expenses="expenses" />
    <OwnerIncidentsTab v-else-if="activeTab === 'incidents'" :incidents="incidents" />
    <OwnerTripsTab v-else-if="activeTab === 'trips'" :trips="trips" />
    <BoatOwnerReservationsTab
      v-else-if="activeTab === 'reservations'"
      :reservations="reservations"
    />
    <BoatOwnerInvoicesTab v-else-if="activeTab === 'invoices'" :invoices="invoices" />
  </div>
</template>
