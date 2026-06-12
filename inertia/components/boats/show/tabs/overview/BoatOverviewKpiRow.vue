<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/use_t'

defineProps<{
  totalEngineHours: number | null
  engineCount: number
  lastMaintenanceDate: string | null
  nextTaskDueDate: string | null
  todayIso: string
}>()

const { t } = useT()

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <BaseCard padded>
      <div class="text-center">
        <p class="text-2xl font-bold text-fg">{{ totalEngineHours ?? '—' }}</p>
        <p class="text-sm text-fg-muted">{{ t('boats.show.overview.engineHours') }}</p>
        <p class="text-xs text-fg-subtle">
          {{ t('boats.show.overview.engineCount', { count: String(engineCount) }) }}
        </p>
      </div>
    </BaseCard>
    <BaseCard padded>
      <div class="text-center">
        <p class="text-2xl font-bold text-fg">{{ formatDate(lastMaintenanceDate) }}</p>
        <p class="text-sm text-fg-muted">{{ t('boats.show.overview.lastMaintenance') }}</p>
      </div>
    </BaseCard>
    <BaseCard padded>
      <div class="text-center">
        <p class="text-2xl font-bold text-fg">{{ formatDate(nextTaskDueDate) }}</p>
        <p class="text-sm text-fg-muted">{{ t('boats.show.overview.nextTask') }}</p>
        <BaseBadge
          v-if="nextTaskDueDate && nextTaskDueDate <= todayIso"
          variant="warning"
          class="mt-1"
        >
          {{ t('boats.show.overview.overdue') }}
        </BaseBadge>
      </div>
    </BaseCard>
  </div>
</template>
