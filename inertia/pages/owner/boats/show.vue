<script setup lang="ts">
import { computed, ref } from 'vue'
import { Link } from '@adonisjs/inertia/vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import BoatOwnerMaintenanceTab from '~/components/owner/BoatOwnerMaintenanceTab.vue'
import BoatOwnerReservationsTab from '~/components/owner/BoatOwnerReservationsTab.vue'
import BoatOwnerInvoicesTab from '~/components/owner/BoatOwnerInvoicesTab.vue'
import { useT } from '~/composables/use_t'
import type { BoatOwnerBoatSummary } from '../../../../shared/types/boat'
import type { BoatReservationRow } from '~/types/reservation'
import type { InvoiceRow } from '../../../../shared/types/invoice'

interface OwnerMaintenanceEvent {
  id: number
  title: string
  subject: string
  notes: string | null
  performedAt: string
  engineCaption: string | null
  sailCaption: string | null
}

const props = defineProps<{
  boat: BoatOwnerBoatSummary
  maintenanceEvents: OwnerMaintenanceEvent[]
  reservations: BoatReservationRow[]
  invoices: InvoiceRow[]
}>()

const { t } = useT()

const activeTab = ref('maintenance')
const tabs = computed(() => [
  {
    key: 'maintenance',
    label: t('owner.boats.show.tabs.maintenance'),
    badge: String(props.maintenanceEvents.length),
  },
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

    <BoatOwnerMaintenanceTab v-if="activeTab === 'maintenance'" :events="maintenanceEvents" />
    <BoatOwnerReservationsTab
      v-else-if="activeTab === 'reservations'"
      :reservations="reservations"
    />
    <BoatOwnerInvoicesTab v-else-if="activeTab === 'invoices'" :invoices="invoices" />
  </div>
</template>
