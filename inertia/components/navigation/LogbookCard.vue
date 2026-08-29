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
  <!-- Repli carte mobile de LogbookRow (#493) — mêmes données, hiérarchisées :
       le trajet et la date priment, la distance est secondaire -->
  <div class="rounded-lg border border-border bg-surface-elevated p-4 space-y-2">
    <div class="flex items-center justify-between gap-3">
      <Link
        :href="`/boats/${row.boatId}/navigation`"
        class="font-medium text-brand hover:underline truncate"
      >
        {{ row.boatName }}
      </Link>
      <BaseBadge :variant="row.status === 'in_progress' ? 'info' : 'success'">
        {{ t(`navigation.logbook.status.${row.status}`) }}
      </BaseBadge>
    </div>

    <p class="text-sm font-medium text-fg">
      {{ row.departurePortName ?? '—' }}
      <span aria-hidden="true">→</span>
      {{ row.arrivalPortName ?? '—' }}
    </p>

    <p class="text-sm text-fg-muted">
      {{ formatDate(row.departedAt) }}
      <template v-if="row.distanceNm">
        · {{ t('navigation.logbook.nm', { count: String(row.distanceNm) }) }}
      </template>
      ·
      <Link
        :href="`/boats/${row.boatId}/navigation-logs/${row.id}`"
        class="font-medium text-brand hover:underline"
      >
        {{ t('navigation_logs.entries.pointCount', { count: String(row.entriesCount) }) }}
      </Link>
    </p>
  </div>
</template>
