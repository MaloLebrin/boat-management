<script setup lang="ts">
import { computed } from 'vue'
import { Head } from '@inertiajs/vue3'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseButton from '~/components/base/BaseButton.vue'
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

function scrollToForm() {
  document.getElementById('reservation-form')?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <Head :title="t('reservations.title')" />

  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb :items="breadcrumbs" />

    <div class="mt-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-fg">{{ t('reservations.title') }}</h1>
        <p class="mt-2 text-base text-fg-muted">{{ boat.name }}</p>
      </div>
      <BaseButton v-if="canManage" @click="scrollToForm">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        {{ t('reservations.form.createTitle') }}
      </BaseButton>
    </div>

    <!-- Stats -->
    <div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div
        class="rounded-(--radius-card) border border-border bg-surface-elevated p-5 shadow-(--shadow-xs)"
      >
        <p class="text-xs font-semibold uppercase tracking-wide text-fg-muted">
          {{ t('reservations.stats.total') }}
        </p>
        <p class="mt-2 font-display text-3xl font-bold tracking-tight text-fg">{{ stats.total }}</p>
      </div>
      <div
        class="rounded-(--radius-card) border border-border bg-surface-elevated p-5 shadow-(--shadow-xs)"
      >
        <div class="flex items-center gap-2">
          <span class="h-2 w-2 rounded-full bg-peach-400" />
          <p class="text-xs font-semibold uppercase tracking-wide text-fg-muted">
            {{ t('reservations.stats.option') }}
          </p>
        </div>
        <p class="mt-2 font-display text-3xl font-bold tracking-tight text-peach-600">
          {{ stats.option }}
        </p>
      </div>
      <div
        class="rounded-(--radius-card) border border-border bg-surface-elevated p-5 shadow-(--shadow-xs)"
      >
        <div class="flex items-center gap-2">
          <span class="h-2 w-2 rounded-full bg-mint-500" />
          <p class="text-xs font-semibold uppercase tracking-wide text-fg-muted">
            {{ t('reservations.stats.confirmed') }}
          </p>
        </div>
        <p class="mt-2 font-display text-3xl font-bold tracking-tight text-mint-600">
          {{ stats.confirmed }}
        </p>
      </div>
    </div>

    <div class="mt-6">
      <ReservationCalendar :reservations="reservations" />
    </div>

    <div id="reservation-form" class="mt-6">
      <ReservationForm v-if="canManage" :boat-id="boat.id" />
    </div>

    <div class="mt-6">
      <ReservationList :boat-id="boat.id" :reservations="reservations" :can-manage="canManage" />
    </div>
  </div>
</template>
