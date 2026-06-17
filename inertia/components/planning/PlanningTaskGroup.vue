<script setup lang="ts">
import type { TaskGroup } from '#shared/types/planning'
import BaseButton from '~/components/base/BaseButton.vue'
import PlanningTaskCard from '~/components/planning/PlanningTaskCard.vue'
import { ref } from 'vue'
import { useT } from '~/composables/use_t'

defineProps<{ group: TaskGroup }>()
const emit = defineEmits<{ ungroup: [groupId: string] }>()

const { t } = useT()
const expanded = ref(false)
</script>

<template>
  <div class="rounded-lg border border-border bg-surface-elevated">
    <div
      class="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 hover:bg-surface-muted"
      @click="expanded = !expanded"
    >
      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold capitalize text-fg">{{ group.subject }}</span>
        <span
          class="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-navy-100 px-1 text-xs font-semibold text-navy-700"
        >
          {{ group.tasks.length }}
        </span>
        <span class="text-xs text-fg-muted"
          >{{ group.earliestDueAt }} → {{ group.latestDueAt }}</span
        >
      </div>
      <div class="flex items-center gap-2">
        <BaseButton variant="ghost" size="sm" @click.stop="emit('ungroup', group.id)">
          {{ t('planning.grouping.ungroup') }}
        </BaseButton>
        <svg
          class="h-4 w-4 text-fg-muted transition-transform"
          :class="expanded ? 'rotate-90' : ''"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
    <div v-if="expanded" class="space-y-2 border-t border-border px-3 pb-3 pt-2">
      <PlanningTaskCard
        v-for="task in group.tasks"
        :key="task.id"
        :task="task"
        accent-class="border-navy-400"
        badge-class="bg-navy-100 text-navy-700"
      />
    </div>
  </div>
</template>
