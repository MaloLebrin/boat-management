<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Link } from '@adonisjs/inertia/vue'
import type { DashboardActiveTrip } from '#shared/types/dashboard'
import { useNotificationHelpers } from '~/composables/use_notification_helpers'
import { useT } from '~/composables/use_t'

const props = defineProps<{ trip: DashboardActiveTrip }>()

const { t } = useT()
const { formatRelativeTime } = useNotificationHelpers()

// « parti il y a 5 h » dépend de l'horloge du client : calculé après montage
// pour ne pas diverger du rendu serveur.
const since = ref<string | null>(null)
onMounted(() => {
  since.value = formatRelativeTime(props.trip.departedAt)
})
</script>

<template>
  <li>
    <Link
      :href="`/boats/${trip.boatId}/navigation`"
      :aria-label="t('dashboard.atSea.open', { boat: trip.boatName })"
      data-testid="dashboard-active-trip-row"
      class="block min-h-11 rounded-(--radius-control) border border-border bg-surface-muted/40 p-3 transition-colors hover:border-border-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="font-semibold text-fg">{{ trip.boatName }}</p>
          <p class="mt-0.5 text-sm text-fg-muted">
            {{
              trip.departurePortName
                ? t('dashboard.atSea.departedFrom', { port: trip.departurePortName })
                : t('dashboard.atSea.departed')
            }}
          </p>
        </div>
        <span
          class="shrink-0 rounded-full bg-sky-700/10 px-2 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-700/20"
        >
          {{ t('dashboard.atSea.pill') }}
        </span>
      </div>
      <p class="mt-2 text-xs text-fg-subtle">
        <span v-if="since">{{ since }}</span>
        <template v-if="trip.crewCount !== null">
          <span v-if="since"> · </span>
          {{ t('dashboard.atSea.crew', { count: String(trip.crewCount) }) }}
        </template>
      </p>
    </Link>
  </li>
</template>
