<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { FleetIncidentRow } from '../../../shared/types/navigation'

const { t } = useT()
const { formatDate } = useDateFormat()

defineProps<{ row: FleetIncidentRow }>()

const statusVariant: Record<string, 'danger' | 'warning' | 'neutral'> = {
  open: 'danger',
  in_progress: 'warning',
  closed: 'neutral',
}
</script>

<template>
  <tr class="hover:bg-surface-muted transition-colors">
    <td class="px-4 py-3 text-sm">
      <BaseBadge :variant="statusVariant[row.status]">
        {{ t(`incidents.status.${row.status}`) }}
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
    <td class="px-4 py-3 text-sm text-fg">{{ t(`incidents.type.${row.type}`) }}</td>
    <td class="px-4 py-3 text-sm text-fg-muted">{{ formatDate(row.occurredAt) }}</td>
    <td class="px-4 py-3 text-sm text-fg-muted">{{ row.location ?? '—' }}</td>
  </tr>
</template>
