<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { FleetLogbookRow } from '../../../shared/types/navigation'

const { t } = useT()
const { formatDate } = useDateFormat()

defineProps<{ row: FleetLogbookRow }>()
</script>

<template>
  <tr class="hover:bg-surface-muted transition-colors">
    <td class="px-4 py-3 text-sm">
      <BaseBadge :variant="row.status === 'in_progress' ? 'info' : 'success'">
        {{ t(`navigation.logbook.status.${row.status}`) }}
      </BaseBadge>
    </td>
    <td class="px-4 py-3 text-sm">
      <Link
        :href="`/boats/${row.boatId}/navigation`"
        class="font-medium text-brand hover:underline"
      >
        {{ row.boatName }}
      </Link>
    </td>
    <td class="px-4 py-3 text-sm text-fg">{{ row.departurePortName ?? '—' }}</td>
    <td class="px-4 py-3 text-sm text-fg">{{ row.arrivalPortName ?? '—' }}</td>
    <td class="px-4 py-3 text-sm text-fg-muted">
      {{ row.distanceNm ? t('navigation.logbook.nm', { count: String(row.distanceNm) }) : '—' }}
    </td>
    <td class="px-4 py-3 text-sm text-fg-muted">
      {{ formatDate(row.departedAt) }}
      <Link
        :href="`/boats/${row.boatId}/navigation-logs/${row.id}`"
        class="ml-2 text-xs font-medium text-brand hover:underline"
      >
        {{ t('navigation_logs.entries.pointCount', { count: String(row.entriesCount) }) }}
      </Link>
    </td>
  </tr>
</template>
