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
  <!-- Repli carte mobile d'IncidentRow (#493) — type et statut priment,
       date et lieu sont secondaires -->
  <div class="rounded-lg border border-border bg-surface-elevated p-4 space-y-2">
    <div class="flex items-center justify-between gap-3">
      <Link
        :href="`/boats/${row.boatId}/navigation`"
        class="font-medium text-brand hover:underline truncate"
      >
        {{ row.boatName }}
      </Link>
      <BaseBadge :variant="incidentStatusVariant(row.status)">
        {{ t(`incidents.status.${row.status}`) }}
      </BaseBadge>
    </div>

    <p class="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
      <Link :href="`/boats/${row.boatId}/incidents/${row.id}`" class="hover:underline">
        {{ t(`incidents.type.${row.type}`) }}
      </Link>
      <IncidentTargetBadge v-if="row.target" :target="row.target" :boat-id="row.boatId" />
    </p>

    <p class="text-sm text-fg-muted">
      {{ formatDate(row.occurredAt) }}
      <template v-if="row.location"> · {{ row.location }}</template>
    </p>
  </div>
</template>
