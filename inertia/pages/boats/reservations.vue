<script setup lang="ts">
import { computed } from 'vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import ReservationCalendar from '~/components/reservations/ReservationCalendar.vue'
import ReservationForm from '~/components/reservations/ReservationForm.vue'
import ReservationList from '~/components/reservations/ReservationList.vue'
import { useT } from '~/composables/use_t'
import type { BoatReservationRow } from '~/types/reservation'

const props = defineProps<{
  boat: { id: number; name: string }
  reservations: BoatReservationRow[]
  canManage: boolean
}>()

const { t } = useT()

const stats = computed(() => ({
  total: props.reservations.length,
  option: props.reservations.filter((r) => r.status === 'option').length,
  confirmed: props.reservations.filter((r) => r.status === 'confirmed').length,
}))

const breadcrumbs = computed(() => [
  { label: t('nav.myBoats'), href: '/boats' },
  { label: props.boat.name, href: `/boats/${props.boat.id}` },
  { label: t('reservations.title') },
])
</script>

<template>
  <div class="space-y-6">
    <BaseBreadcrumb :items="breadcrumbs" />

    <div class="flex items-center justify-between">
      <BaseHeading level="1">{{ t('reservations.title') }}</BaseHeading>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-4">
      <div class="rounded-lg border border-border bg-surface-elevated p-4 text-center">
        <p class="text-2xl font-bold text-fg">{{ stats.total }}</p>
        <p class="text-xs text-fg-muted">{{ t('reservations.stats.total') }}</p>
      </div>
      <div class="rounded-lg border border-border bg-surface-elevated p-4 text-center">
        <p class="text-2xl font-bold text-peach-600">{{ stats.option }}</p>
        <p class="text-xs text-fg-muted">{{ t('reservations.stats.option') }}</p>
      </div>
      <div class="rounded-lg border border-border bg-surface-elevated p-4 text-center">
        <p class="text-2xl font-bold text-mint-600">{{ stats.confirmed }}</p>
        <p class="text-xs text-fg-muted">{{ t('reservations.stats.confirmed') }}</p>
      </div>
    </div>

    <ReservationCalendar :reservations="reservations" />

    <ReservationForm v-if="canManage" :boat-id="boat.id" />

    <ReservationList :boat-id="boat.id" :reservations="reservations" :can-manage="canManage" />
  </div>
</template>
