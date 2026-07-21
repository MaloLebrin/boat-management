<script setup lang="ts">
import { computed } from 'vue'
import BoatTaskActions from '~/components/boats/maintenance/BoatTaskActions.vue'
import type { MaintenanceTaskRow } from '~/types/boat_show'
import { useT } from '~/composables/use_t'
import { useDateFormat } from '~/composables/use_date_format'

// Carte teintée d'une tâche en retard / bientôt due, partagée par les sections
// « Urgent » (coral) et « Bientôt dû » (amber) de l'onglet Tâches (#407).
const props = defineProps<{
  task: MaintenanceTaskRow
  boatId: number
  componentLabel: string
  canManage: boolean
  tone: 'overdue' | 'soon'
}>()

const { t } = useT()
const { formatDate } = useDateFormat()

const cardClass = computed(() =>
  props.tone === 'overdue'
    ? 'rounded-lg border border-coral-200 bg-coral-50 p-4'
    : 'rounded-lg border border-amber-200 bg-amber-50 p-4'
)

const dueClass = computed(() =>
  props.tone === 'overdue' ? 'mt-1 text-xs text-coral-700' : 'mt-1 text-xs text-amber-700'
)
</script>

<template>
  <div :class="cardClass">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="font-semibold text-fg">{{ task.title }}</p>
        <p class="text-sm text-fg-muted">{{ componentLabel }}</p>
        <p v-if="task.dueAt" :class="dueClass">
          {{ t('boats.maintenance.tasks.dueAt', { date: formatDate(task.dueAt) }) }}
        </p>
        <p v-else-if="task.dueEngineHours !== null" :class="dueClass">
          {{ t('boats.maintenance.tasks.dueHours', { hours: task.dueEngineHours }) }}
        </p>
        <p v-if="task.notes" class="mt-2 text-sm text-fg-muted">{{ task.notes }}</p>
      </div>
      <BoatTaskActions v-if="canManage" :boat-id="boatId" :task="task" />
    </div>
  </div>
</template>
