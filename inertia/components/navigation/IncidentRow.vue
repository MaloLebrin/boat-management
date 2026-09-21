<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import IncidentTargetBadge from '~/components/boats/incidents/IncidentTargetBadge.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { FleetIncidentRow } from '../../../shared/types/navigation'
import { incidentStatusVariant } from '~/utils/status_variants'

const { t } = useT()
const { formatDate } = useDateFormat()

defineProps<{ row: FleetIncidentRow }>()
</script>

<template>
  <tr class="hover:bg-surface-muted transition-colors">
    <td class="px-4 py-3 text-sm">
      <BaseBadge :variant="incidentStatusVariant(row.status)">
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
    <td class="px-4 py-3 text-sm text-fg">
      <span class="inline-flex flex-wrap items-center gap-2">
        <Link :href="`/boats/${row.boatId}/incidents/${row.id}`" class="hover:underline">
          {{ t(`incidents.type.${row.type}`) }}
        </Link>
        <IncidentTargetBadge v-if="row.target" :target="row.target" :boat-id="row.boatId" />
      </span>
    </td>
    <td class="px-4 py-3 text-sm text-fg-muted">{{ formatDate(row.occurredAt) }}</td>
    <td class="px-4 py-3 text-sm text-fg-muted">{{ row.location ?? '—' }}</td>
  </tr>
</template>
