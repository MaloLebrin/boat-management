<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import { useT } from '~/composables/use_t'

interface OwnerMaintenanceEvent {
  id: number
  title: string
  subject: string
  notes: string | null
  performedAt: string
  engineCaption: string | null
  sailCaption: string | null
}

defineProps<{
  events: OwnerMaintenanceEvent[]
}>()

const { t } = useT()

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}
</script>

<template>
  <BaseEmptyState
    v-if="events.length === 0"
    :title="t('owner.boats.show.maintenance.emptyTitle')"
  />

  <div v-else class="flex flex-col gap-3">
    <BaseCard v-for="event in events" :key="event.id">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-fg">{{ event.title }}</p>
          <p class="text-xs text-fg-muted">
            {{ t(`maintenance.subjects.${event.subject}`) }}
            <span v-if="event.engineCaption"> · {{ event.engineCaption }}</span>
            <span v-if="event.sailCaption"> · {{ event.sailCaption }}</span>
          </p>
          <p v-if="event.notes" class="mt-2 text-sm text-fg-muted">{{ event.notes }}</p>
        </div>
        <span class="shrink-0 text-xs text-fg-muted">{{ formatDate(event.performedAt) }}</span>
      </div>
    </BaseCard>
  </div>
</template>
