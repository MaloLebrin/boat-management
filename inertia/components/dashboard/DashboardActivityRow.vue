<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Link } from '@adonisjs/inertia/vue'
import type { DashboardActivityItem } from '#shared/types/dashboard'
import { useNotificationHelpers } from '~/composables/use_notification_helpers'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import { maintenanceSubjectLabel } from '~/utils/boat_enum_labels'

const props = defineProps<{ item: DashboardActivityItem }>()

const { t } = useT()
const { formatRelativeTime } = useNotificationHelpers()
const { formatNumber, formatCurrency } = useNumberFormat()

// Le temps relatif dépend de l'horloge du client : calculé après montage.
const when = ref<string | null>(null)
onMounted(() => {
  when.value = formatRelativeTime(props.item.occurredAt)
})

const ICON: Record<DashboardActivityItem['kind'], string> = {
  trip_completed: '⚓',
  task_done: '✓',
  incident_reported: '⚠',
  fuel_logged: '⛽',
  document_added: '📄',
}

const label = computed(() => {
  const item = props.item
  switch (item.kind) {
    case 'trip_completed':
      return t('dashboard.activity.kind.tripCompleted', {
        from: item.departurePortName ?? '—',
        to: item.arrivalPortName ?? '—',
      })
    case 'task_done':
      return t('dashboard.activity.kind.taskDone', {
        title: item.title,
        subject: maintenanceSubjectLabel(t, item.subject) ?? item.subject,
      })
    case 'incident_reported':
      return t('dashboard.activity.kind.incidentReported', {
        type: t(`incidents.type.${item.incidentType}`),
      })
    case 'fuel_logged':
      return t('dashboard.activity.kind.fuelLogged', {
        liters: formatNumber(item.quantityLiters),
        cost: item.totalCost !== null ? formatCurrency(item.totalCost) : '—',
      })
    default:
      return t('dashboard.activity.kind.documentAdded', {
        type:
          item.documentType === 'other' && item.customTypeLabel
            ? item.customTypeLabel
            : t(`boats.adminDocs.types.${item.documentType}`),
      })
  }
})

const detail = computed(() => {
  const item = props.item
  if (item.kind === 'trip_completed' && item.distanceNm !== null) {
    return t('dashboard.activity.distance', { nm: formatNumber(item.distanceNm) })
  }
  return null
})
</script>

<template>
  <li>
    <Link
      :href="item.href"
      data-testid="dashboard-activity-row"
      :data-kind="item.kind"
      class="flex min-h-11 items-start gap-3 rounded-(--radius-control) px-2 py-2 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
    >
      <span
        class="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-sm text-fg-muted"
        aria-hidden="true"
      >
        {{ ICON[item.kind] }}
      </span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm text-fg">
          <span class="font-semibold">{{ item.boatName }}</span>
          <span class="text-fg-muted"> · {{ label }}</span>
        </span>
        <span class="mt-0.5 block text-xs text-fg-subtle">
          <span v-if="when">{{ when }}</span>
          <template v-if="detail"> <span v-if="when"> · </span>{{ detail }} </template>
        </span>
      </span>
    </Link>
  </li>
</template>
