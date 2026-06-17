<script setup lang="ts">
import type { PlanningTask } from '#shared/types/planning'
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/use_t'

defineProps<{ tasks: PlanningTask[] }>()

const { t } = useT()
</script>

<template>
  <BaseCard v-if="tasks.length > 0">
    <template #header>
      <h2 class="text-sm font-semibold text-fg">{{ t('planning.calendar.hourTriggered') }}</h2>
    </template>
    <div class="space-y-2">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="flex items-center justify-between rounded-lg border border-border px-3 py-2"
      >
        <div>
          <p class="text-sm font-medium text-fg">{{ task.title }}</p>
          <p class="text-xs text-fg-muted">{{ task.boatName }} · {{ task.subject }}</p>
        </div>
        <div class="text-right">
          <p class="text-sm font-semibold text-fg">
            {{ task.currentEngineHours ?? 0 }}h / {{ task.dueEngineHours }}h
          </p>
          <div class="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-surface-muted">
            <div
              class="h-full rounded-full transition-all"
              :class="
                (task.currentEngineHours ?? 0) >= (task.dueEngineHours ?? 1)
                  ? 'bg-red-500'
                  : 'bg-navy-500'
              "
              :style="{
                width: `${Math.min(100, ((task.currentEngineHours ?? 0) / (task.dueEngineHours ?? 1)) * 100)}%`,
              }"
            />
          </div>
        </div>
      </div>
    </div>
  </BaseCard>
</template>
