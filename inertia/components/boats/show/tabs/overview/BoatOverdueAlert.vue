<script setup lang="ts">
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import { useDateFormat } from '~/composables/use_date_format'
import type { MaintenanceTaskRow } from '~/types/boat_show'

defineProps<{ overdueTasks: MaintenanceTaskRow[] }>()
const emit = defineEmits<{ 'go-to-tab': [tab: string] }>()
const { t } = useT()
const { formatDate } = useDateFormat()
</script>

<template>
  <div v-if="overdueTasks.length > 0" class="rounded-lg border border-coral-300 bg-coral-50 p-4">
    <div class="flex items-start gap-3">
      <ExclamationTriangleIcon class="mt-0.5 h-5 w-5 shrink-0 text-coral-600" />
      <div class="flex-1">
        <p class="font-semibold text-coral-900">
          {{ t('boats.show.overview.overdueTasks', { count: String(overdueTasks.length) }) }}
        </p>
        <ul class="mt-2 space-y-1 text-sm text-coral-800">
          <li v-for="task in overdueTasks.slice(0, 3)" :key="task.id">
            {{ task.title }} - {{ formatDate(task.dueAt) }}
          </li>
        </ul>
        <BaseButton variant="secondary" size="sm" class="mt-3" @click="emit('go-to-tab', 'tasks')">
          {{ t('boats.show.overview.schedule') }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>
