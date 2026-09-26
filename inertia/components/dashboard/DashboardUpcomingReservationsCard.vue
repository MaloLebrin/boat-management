<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseCard from '~/components/base/BaseCard.vue'
import ReservationStatusBadge from '~/components/reservations/ReservationStatusBadge.vue'
import type { DashboardUpcomingReservation } from '#shared/types/dashboard'
import { UPCOMING_RESERVATIONS_DAYS } from '#shared/constants/dashboard'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'

defineProps<{ items: DashboardUpcomingReservation[] }>()

const { t } = useT()
const { formatWeekdayDay, formatTime } = useDateFormat()
</script>

<template>
  <!-- Module Location (#832) : départs et retours des 7 prochains jours,
       à côté de « En mer » — les deux cartes « aujourd'hui » de la flotte. -->
  <BaseCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 class="text-sm font-semibold text-fg">{{ t('dashboard.upcoming.title') }}</h2>
        <Link
          href="/reservations"
          data-testid="dashboard-upcoming-view-all"
          class="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline"
        >
          {{ t('dashboard.upcoming.viewAll') }}
        </Link>
      </div>
      <p class="mt-1 text-xs font-medium text-fg-muted">
        {{ t('dashboard.upcoming.period', { days: String(UPCOMING_RESERVATIONS_DAYS) }) }}
      </p>
    </template>

    <p v-if="items.length === 0" class="text-sm text-fg-muted">
      {{ t('dashboard.upcoming.empty') }}
    </p>

    <ul v-else class="space-y-3 text-sm">
      <li v-for="item in items" :key="`${item.id}-${item.event}`">
        <Link
          :href="`/reservations?boatId=${item.boatId}`"
          data-testid="dashboard-upcoming-row"
          class="block min-h-11 rounded-(--radius-control) border border-border bg-surface-muted/40 p-3 transition-colors hover:border-border-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-fg">
                <span class="text-fg-muted">{{ formatWeekdayDay(item.at) }} ·</span>
                {{ item.boatName }}
              </p>
              <p class="mt-0.5 text-sm text-fg-muted">
                {{ t(`dashboard.upcoming.${item.event}`, { time: formatTime(item.at) }) }} ·
                {{ item.clientName }}
              </p>
            </div>
            <ReservationStatusBadge :status="item.status" class="shrink-0" />
          </div>
        </Link>
      </li>
    </ul>
  </BaseCard>
</template>
