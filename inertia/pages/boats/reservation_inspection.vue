<script setup lang="ts">
import { computed, ref } from 'vue'
import { Head } from '@inertiajs/vue3'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import InspectionComparison from '~/components/reservations/inspection/InspectionComparison.vue'
import InspectionPanel from '~/components/reservations/inspection/InspectionPanel.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { BoatCategory } from '#shared/types/boat_catalog'
import type { BoatReservationRow } from '~/types/reservation'
import type { InspectionWithPhotos } from '~/types/inspection'

const props = defineProps<{
  boat: { id: number; name: string; category: BoatCategory | null }
  reservation: BoatReservationRow
  inspections: InspectionWithPhotos[]
  canEdit: boolean
  canDelete: boolean
  canManageActions: boolean
  canDeleteActions: boolean
}>()

const { t } = useT()
const { formatDate } = useDateFormat()

const checkout = computed(() => props.inspections.find((i) => i.kind === 'checkout') ?? null)
const checkin = computed(() => props.inspections.find((i) => i.kind === 'checkin') ?? null)

// Sous lg, les deux panneaux basculent en onglets (#495) : empilés, comparer
// départ et retour demandait un défilement interminable — l'objet même de
// l'écran. Chaque panneau n'est rendu qu'une fois (ids de formulaires uniques),
// seule sa visibilité change selon le breakpoint.
const activePanel = ref('checkout')

const panelTabs = computed(() => [
  { key: 'checkout', label: t('inspections.kind.checkout') },
  { key: 'checkin', label: t('inspections.kind.checkin') },
])

const breadcrumbs = computed(() => [
  { label: t('boats.index.title'), href: '/boats' },
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

    <div class="mt-6 lg:hidden">
      <BaseTabs v-model="activePanel" :tabs="panelTabs" />
    </div>

    <div class="mt-4 grid grid-cols-1 gap-6 lg:mt-6 lg:grid-cols-2">
      <InspectionPanel
        :boat-id="boat.id"
        :reservation-id="reservation.id"
        kind="checkout"
        :inspection="checkout"
        :category="boat.category"
        :counterpart="null"
        :can-edit="canEdit"
        :can-delete="canDelete"
        :can-manage-actions="canManageActions"
        :can-delete-actions="canDeleteActions"
        :class="activePanel === 'checkout' ? '' : 'hidden lg:block'"
      />
      <InspectionPanel
        :boat-id="boat.id"
        :reservation-id="reservation.id"
        kind="checkin"
        :inspection="checkin"
        :category="boat.category"
        :counterpart="checkout"
        :can-edit="canEdit"
        :can-delete="canDelete"
        :can-manage-actions="canManageActions"
        :can-delete-actions="canDeleteActions"
        :class="activePanel === 'checkin' ? '' : 'hidden lg:block'"
      />
    </div>

    <div class="mt-6">
      <InspectionComparison :checkout="checkout" :checkin="checkin" />
    </div>
  </div>
</template>
