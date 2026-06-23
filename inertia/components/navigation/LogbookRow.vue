<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useT } from '~/composables/use_t'
import type { FleetLogbookRow } from '../../../shared/types/navigation'

const { t, locale } = useT()

defineProps<{ row: FleetLogbookRow }>()

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(locale.value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
</script>

<template>
  <tr class="hover:bg-surface-muted transition-colors">
    <td class="px-4 py-3 text-sm">
      <BaseBadge :variant="row.status === 'in_progress' ? 'info' : 'success'">
        {{ t(`navigation.logbook.status.${row.status}`) }}
      </BaseBadge>
    </td>
    <td class="px-4 py-3 text-sm">
      <a :href="`/boats/${row.boatId}/navigation`" class="font-medium text-brand hover:underline">
        {{ row.boatName }}
      </a>
    </td>
    <td class="px-4 py-3 text-sm text-fg">{{ row.departurePortName ?? '—' }}</td>
    <td class="px-4 py-3 text-sm text-fg">{{ row.arrivalPortName ?? '—' }}</td>
    <td class="px-4 py-3 text-sm text-fg-muted">
      {{ row.distanceNm ? t('navigation.logbook.nm', { count: String(row.distanceNm) }) : '—' }}
    </td>
    <td class="px-4 py-3 text-sm text-fg-muted">{{ formatDate(row.departedAt) }}</td>
  </tr>
</template>
