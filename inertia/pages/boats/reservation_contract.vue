<script setup lang="ts">
import { computed } from 'vue'
import { Head } from '@inertiajs/vue3'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import ContractPanel from '~/components/reservations/contract/ContractPanel.vue'
import { useReservationFormat } from '~/composables/use_reservation_format'
import { useT } from '~/composables/use_t'
import type { BoatReservationRow } from '~/types/reservation'
import type { RentalContractRow } from '~/types/rental_contract'

const props = defineProps<{
  boat: { id: number; name: string }
  reservation: BoatReservationRow
  contract: RentalContractRow | null
  canEdit: boolean
  canDelete: boolean
}>()

const { t } = useT()
const { formatDate } = useReservationFormat()

const breadcrumbs = computed(() => [
  { label: t('nav.myBoats'), href: '/boats' },
  { label: props.boat.name, href: `/boats/${props.boat.id}` },
  { label: t('reservations.title'), href: `/boats/${props.boat.id}/reservations` },
  { label: t('rentalContracts.title') },
])
</script>

<template>
  <Head :title="t('rentalContracts.title')" />

  <div class="w-full max-w-3xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb :items="breadcrumbs" />

    <div class="mt-6">
      <h1 class="text-3xl font-semibold tracking-tight text-fg">
        {{ t('rentalContracts.title') }}
      </h1>
      <p class="mt-2 text-base text-fg-muted">
        {{ reservation.clientName }} · {{ formatDate(reservation.startsAt) }}
        <span class="text-fg-subtle">→</span>
        {{ formatDate(reservation.endsAt) }}
      </p>
    </div>

    <div class="mt-6">
      <ContractPanel
        :boat-id="boat.id"
        :reservation-id="reservation.id"
        :contract="contract"
        :can-edit="canEdit"
        :can-delete="canDelete"
      />
    </div>
  </div>
</template>
