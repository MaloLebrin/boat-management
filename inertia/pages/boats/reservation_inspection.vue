<script setup lang="ts">
import { computed } from 'vue'
import { Head } from '@inertiajs/vue3'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import InspectionComparison from '~/components/reservations/inspection/InspectionComparison.vue'
import InspectionPanel from '~/components/reservations/inspection/InspectionPanel.vue'
import { useReservationFormat } from '~/composables/use_reservation_format'
import { useT } from '~/composables/use_t'
import type { BoatReservationRow } from '~/types/reservation'
import type { InspectionWithPhotos } from '~/types/inspection'

const props = defineProps<{
  boat: { id: number; name: string }
  reservation: BoatReservationRow
  inspections: InspectionWithPhotos[]
  canEdit: boolean
  canDelete: boolean
  canManageActions: boolean
  canDeleteActions: boolean
}>()

const { t } = useT()
const { formatDate } = useReservationFormat()

const checkout = computed(() => props.inspections.find((i) => i.kind === 'checkout') ?? null)
const checkin = computed(() => props.inspections.find((i) => i.kind === 'checkin') ?? null)

const breadcrumbs = computed(() => [
  { label: t('nav.myBoats'), href: '/boats' },
  { label: props.boat.name, href: `/boats/${props.boat.id}` },
  { label: t('reservations.title'), href: `/boats/${props.boat.id}/reservations` },
  { label: t('inspections.title') },
])
</script>

<template>
  <Head :title="t('inspections.title')" />

  <div class="w-full max-w-5xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb :items="breadcrumbs" />

    <div class="mt-6">
      <h1 class="text-3xl font-semibold tracking-tight text-fg">{{ t('inspections.title') }}</h1>
      <p class="mt-2 text-base text-fg-muted">
        {{ reservation.clientName }} · {{ formatDate(reservation.startsAt) }}
        <span class="text-fg-subtle">→</span>
        {{ formatDate(reservation.endsAt) }}
      </p>
    </div>

    <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <InspectionPanel
        :boat-id="boat.id"
        :reservation-id="reservation.id"
        kind="checkout"
        :inspection="checkout"
        :can-edit="canEdit"
        :can-delete="canDelete"
        :can-manage-actions="canManageActions"
        :can-delete-actions="canDeleteActions"
      />
      <InspectionPanel
        :boat-id="boat.id"
        :reservation-id="reservation.id"
        kind="checkin"
        :inspection="checkin"
        :can-edit="canEdit"
        :can-delete="canDelete"
        :can-manage-actions="canManageActions"
        :can-delete-actions="canDeleteActions"
      />
    </div>

    <div class="mt-6">
      <InspectionComparison :checkout="checkout" :checkin="checkin" />
    </div>
  </div>
</template>
