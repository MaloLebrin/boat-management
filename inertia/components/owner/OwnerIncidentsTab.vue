<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { OwnerIncidentRow } from '#shared/types/owner_portal'

/** Incidents du bateau (#890) : nature, état et dates, sans le détail interne. */
defineProps<{ incidents: OwnerIncidentRow[] }>()

const { t } = useT()
const { formatDate } = useDateFormat()
</script>

<template>
  <BaseEmptyState
    v-if="incidents.length === 0"
    :title="t('owner.boats.show.incidents.emptyTitle')"
  />

  <div v-else class="flex flex-col gap-3">
    <BaseCard v-for="incident in incidents" :key="incident.id">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-fg">{{ t(`incidents.type.${incident.type}`) }}</p>
          <p class="text-xs text-fg-muted">{{ formatDate(incident.occurredAt) }}</p>
        </div>
        <BaseBadge :variant="incident.status === 'closed' ? 'success' : 'warning'">
          {{ t(`incidents.status.${incident.status}`) }}
        </BaseBadge>
      </div>
    </BaseCard>
  </div>
</template>
