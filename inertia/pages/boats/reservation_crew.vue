<script setup lang="ts">
import { computed } from 'vue'
import { Head } from '@inertiajs/vue3'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import ReservationCrewAssignForm from '~/components/reservations/crew/ReservationCrewAssignForm.vue'
import ReservationCrewList from '~/components/reservations/crew/ReservationCrewList.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { CrewAvailabilityRow, ReservationCrewRow } from '#shared/types/crew'
import type { BoatReservationRow } from '~/types/reservation'

/**
 * Équipage d'une réservation (#883) : qui embarque, avec quel rôle, le
 * sélecteur d'équipiers disponibles et le rôle d'équipage PDF.
 */
const props = defineProps<{
  boat: { id: number; name: string }
  reservation: BoatReservationRow
  crew: ReservationCrewRow[]
  availability: CrewAvailabilityRow[]
  canManage: boolean
  canManageCrew: boolean
}>()

const { t } = useT()
const { formatDateTime } = useDateFormat()

const breadcrumbs = computed(() => [
  { label: t('boats.index.title'), href: '/boats' },
  { label: props.boat.name, href: `/boats/${props.boat.id}` },
  { label: t('reservations.title'), href: `/boats/${props.boat.id}/reservations` },
  { label: t('crew.planning.reservationTitle') },
])

// Une location `skippered` attend son skipper : le sélecteur le propose d'abord.
const defaultRole = computed(() =>
  props.reservation.type === 'skippered' && !props.crew.some((c) => c.role === 'skipper')
    ? 'skipper'
    : 'crew'
)
const missingSkipper = computed(
  () => props.reservation.type === 'skippered' && !props.crew.some((c) => c.role === 'skipper')
)
const isCancelled = computed(() => props.reservation.status === 'cancelled')
</script>

<template>
  <Head :title="t('crew.planning.reservationTitle')" />

  <div class="w-full max-w-3xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb :items="breadcrumbs" />

    <div class="mt-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-fg">
          {{ t('crew.planning.reservationTitle') }}
        </h1>
        <p class="mt-2 text-base text-fg-muted">
          {{ boat.name }} · {{ reservation.clientName }} ·
          {{ formatDateTime(reservation.startsAt) }}
          <span class="text-fg-subtle">→</span>
          {{ formatDateTime(reservation.endsAt) }}
        </p>
      </div>
      <!-- Téléchargement PDF : `external-href`, une visite Inertia rendrait le binaire. -->
      <BaseButton
        variant="secondary"
        size="sm"
        external-href
        :href="`/boats/${boat.id}/reservations/${reservation.id}/crew/pdf`"
        data-testid="reservation-crew-pdf"
      >
        {{ t('crew.planning.downloadPdf') }}
      </BaseButton>
    </div>

    <BaseBadge v-if="missingSkipper" variant="warning" class="mt-4">
      {{ t('crew.planning.missingSkipper') }}
    </BaseBadge>

    <BaseCard class="mt-6">
      <h2 class="mb-3 text-lg font-semibold text-fg">{{ t('crew.planning.onBoard') }}</h2>
      <ReservationCrewList
        :boat-id="boat.id"
        :reservation-id="reservation.id"
        :crew="crew"
        :can-manage="canManage"
        :can-open-member="canManageCrew"
      />
    </BaseCard>

    <BaseCard v-if="canManage && !isCancelled" class="mt-6">
      <h2 class="mb-3 text-lg font-semibold text-fg">{{ t('crew.planning.addTitle') }}</h2>
      <ReservationCrewAssignForm
        :boat-id="boat.id"
        :reservation-id="reservation.id"
        :availability="availability"
        :default-role="defaultRole"
      />
    </BaseCard>
    <p v-else-if="isCancelled" class="mt-6 text-sm text-fg-muted">
      {{ t('crew.planning.cancelledReservation') }}
    </p>
  </div>
</template>
