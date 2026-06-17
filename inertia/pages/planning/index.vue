<script setup lang="ts">
import type { PlanningTask, TaskGroup } from '#shared/types/planning'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import PlanningCalendar from '~/components/planning/PlanningCalendar.vue'
import PlanningKanban from '~/components/planning/PlanningKanban.vue'
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  tasks: PlanningTask[]
  overdueTasks: PlanningTask[]
  soonTasks: PlanningTask[]
  plannedTasks: PlanningTask[]
  doneTasks: PlanningTask[]
  groups: TaskGroup[]
  canGroupTasks: boolean
}>()

const { t } = useT()

type ViewMode = 'kanban' | 'calendar'
const viewMode = ref<ViewMode>('kanban')
const groupingEnabled = ref(true)
const dismissedGroupIds = ref(new Set<string>())

const allTasks = computed(() => [...props.tasks, ...props.doneTasks])

function handleUngroup(groupId: string) {
  dismissedGroupIds.value = new Set([...dismissedGroupIds.value, groupId])
}
</script>

<template>
  <div class="w-full max-w-7xl flex-col px-6 py-10 sm:px-8">
    <!-- Page header -->
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <BaseHeading level="1">{{ t('planning.title') }}</BaseHeading>
        <p class="mt-1 text-sm text-fg-muted">{{ t('planning.subtitle') }}</p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Grouping toggle (Pro+) -->
        <BaseButton
          v-if="canGroupTasks"
          variant="ghost"
          size="sm"
          :title="t('planning.grouping.toggleTitle')"
          :class="[
            'gap-1.5 border transition-colors',
            groupingEnabled
              ? 'border-navy-300 bg-navy-50 text-navy-700'
              : 'border-border bg-surface text-fg-muted hover:text-fg',
          ]"
          @click="groupingEnabled = !groupingEnabled"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {{ t('planning.grouping.toggle') }}
        </BaseButton>

        <!-- View toggle -->
        <div class="flex items-center gap-1 rounded-lg border border-border bg-surface-muted p-1">
          <BaseButton
            variant="ghost"
            size="sm"
            :class="[
              'gap-2',
              viewMode === 'kanban'
                ? 'bg-surface-elevated text-fg shadow-sm'
                : 'text-fg-muted hover:text-fg',
            ]"
            @click="viewMode = 'kanban'"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              />
            </svg>
            {{ t('planning.viewKanban') }}
          </BaseButton>
          <BaseButton
            variant="ghost"
            size="sm"
            :class="[
              'gap-2',
              viewMode === 'calendar'
                ? 'bg-surface-elevated text-fg shadow-sm'
                : 'text-fg-muted hover:text-fg',
            ]"
            @click="viewMode = 'calendar'"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {{ t('planning.viewCalendar') }}
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Pro teaser when starter plan -->
    <div
      v-if="!canGroupTasks && tasks.length > 0"
      class="mb-4 flex items-center gap-3 rounded-lg border border-navy-200 bg-navy-50 px-4 py-3 text-sm text-navy-700"
    >
      <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
      {{ t('planning.grouping.proTeaser') }}
    </div>

    <!-- Empty state -->
    <div v-if="allTasks.length === 0">
      <BaseEmptyState
        :title="t('planning.empty.title')"
        :description="t('planning.empty.description')"
        :action-label="t('planning.empty.action')"
        @action="router.visit('/boats')"
      />
    </div>

    <PlanningKanban
      v-else-if="viewMode === 'kanban'"
      :overdue-tasks="overdueTasks"
      :soon-tasks="soonTasks"
      :planned-tasks="plannedTasks"
      :done-tasks="doneTasks"
      :groups="groups"
      :grouping-enabled="groupingEnabled"
      :dismissed-group-ids="dismissedGroupIds"
      @ungroup="handleUngroup"
    />

    <PlanningCalendar v-else :tasks="tasks" />
  </div>
</template>
