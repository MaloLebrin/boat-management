<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import BoatMaintenanceEventsPanel from './BoatMaintenanceEventsPanel.vue'
import BoatMaintenanceTasksPanel from './BoatMaintenanceTasksPanel.vue'
import type {
  BoatCreateIntent,
  BoatShowDetail,
  MaintenanceEventRow,
  MaintenanceTaskRow,
} from '~/types/boat_show'
import { subjectLabel } from './utils'

const props = withDefaults(
  defineProps<{
    boat: BoatShowDetail
    maintenanceEvents: MaintenanceEventRow[]
    maintenanceTasks: MaintenanceTaskRow[]
    canManageMaintenance: boolean
    createIntent?: BoatCreateIntent
  }>(),
  { createIntent: null }
)

defineEmits<{ createIntentConsumed: [] }>()

const panel = ref<'tasks' | 'events'>('tasks')
const openTasks = computed(() => props.maintenanceTasks.filter((t) => t.status === 'open'))
</script>

<template>
  <BaseCard padded>
    <template #header>
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="space-y-1">
          <p class="text-sm font-semibold text-fg">Maintenance</p>
          <p class="text-sm text-fg-muted">
            Tasks first, then history. Subjects: {{ subjectLabel('boat') }},
            {{ subjectLabel('engine') }}, {{ subjectLabel('sail') }}, {{ subjectLabel('rig') }}.
          </p>
        </div>
        <BaseTabs
          v-model="panel"
          :tabs="[
            { key: 'tasks', label: 'Tasks', badge: String(openTasks.length) },
            { key: 'events', label: 'Events', badge: String(maintenanceEvents.length) },
          ]"
        />
      </div>
    </template>

    <div class="mt-5">
      <BoatMaintenanceTasksPanel
        v-if="panel === 'tasks'"
        :boat="boat"
        :tasks="maintenanceTasks"
        :can-manage-maintenance="canManageMaintenance"
        :create-intent="createIntent"
        @create-intent-consumed="$emit('createIntentConsumed')"
      />
      <BoatMaintenanceEventsPanel
        v-else
        :boat="boat"
        :events="maintenanceEvents"
        :can-manage-maintenance="canManageMaintenance"
      />
    </div>
  </BaseCard>
</template>
