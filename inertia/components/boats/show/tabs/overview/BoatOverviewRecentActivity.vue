<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { subjectLabel } from '~/components/boats/maintenance/utils'
import { useT } from '~/composables/use_t'
import { useDateFormat } from '~/composables/use_date_format'
import type { MaintenanceEventRow } from '~/types/boat_show'

defineProps<{ recentEvents: MaintenanceEventRow[] }>()
const emit = defineEmits<{ 'go-to-tab': [tab: string] }>()
const { t } = useT()
const { formatDate } = useDateFormat()
</script>

<template>
  <BaseCard padded>
    <template #header>
      <p class="text-sm font-semibold text-fg">
        {{ t('boats.show.overview.recentActivityTitle') }}
      </p>
    </template>
    <div v-if="recentEvents.length === 0" class="text-sm text-fg-muted">
      {{ t('boats.show.overview.recentActivityEmpty') }}
    </div>
    <ul v-else class="space-y-3 text-sm">
      <li v-for="ev in recentEvents" :key="ev.id" class="flex items-start justify-between gap-3">
        <div>
          <p class="font-semibold text-fg">{{ ev.title }}</p>
          <p class="text-fg-muted">{{ subjectLabel(t, ev.subject) }}</p>
        </div>
        <span class="shrink-0 text-fg-subtle">{{ formatDate(ev.performedAt) }}</span>
      </li>
    </ul>
    <div class="mt-4">
      <BaseButton variant="ghost" size="sm" @click="emit('go-to-tab', 'history')">
        {{ t('boats.show.overview.viewHistory') }}
      </BaseButton>
    </div>
  </BaseCard>
</template>
