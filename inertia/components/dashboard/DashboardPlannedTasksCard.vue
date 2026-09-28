<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { computed } from 'vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseSegmentedControl from '~/components/base/BaseSegmentedControl.vue'
import BaseSkeleton from '~/components/base/BaseSkeleton.vue'
import type { DashboardPlannedTasks } from '#shared/types/dashboard'
import { PLANNED_TASKS_DAYS } from '#shared/constants/dashboard_widgets'
import { useDateFormat } from '~/composables/use_date_format'
import { useMineAllScope } from '~/composables/use_mine_all_scope'
import { useT } from '~/composables/use_t'
import { maintenanceSubjectLabel } from '~/utils/boat_enum_labels'

/** `undefined` = prop différée pas encore arrivée (squelette). */
const props = defineProps<{ plannedTasks: DashboardPlannedTasks | undefined }>()

const { t } = useT()
const { formatDate } = useDateFormat()

// « Mes tâches à venir » (#868) : la bascule n'apparaît que si des tâches de la
// fenêtre me sont confiées, et elle s'ouvre alors sur les miennes.
const hasMine = computed(() => (props.plannedTasks?.mine?.total ?? 0) > 0)
const { scope, scopeOptions, setScope } = useMineAllScope(() => (hasMine.value ? 'mine' : 'all'), {
  mine: 'dashboard.plannedTasks.scope.mine',
  all: 'dashboard.plannedTasks.scope.all',
})

const list = computed(() => {
  if (!props.plannedTasks) return undefined
  return scope.value === 'mine' && props.plannedTasks.mine
    ? props.plannedTasks.mine
    : props.plannedTasks
})
</script>

<template>
  <!-- Widget « Tâches planifiées » : les tâches ouvertes datées des 30 prochains
       jours, la plus proche d'abord. Les retards restent dans « À traiter ». -->
  <BaseCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 class="text-sm font-semibold text-fg">{{ t('dashboard.plannedTasks.title') }}</h2>
        <Link
          href="/planning"
          data-testid="dashboard-planned-view-all"
          class="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline"
        >
          {{ t('dashboard.plannedTasks.viewAll') }}
        </Link>
      </div>
      <p class="mt-1 text-xs font-medium text-fg-muted">
        {{ t('dashboard.plannedTasks.period', { days: String(PLANNED_TASKS_DAYS) }) }}
      </p>
      <BaseSegmentedControl
        v-if="hasMine"
        class="mt-2"
        :model-value="scope"
        :options="scopeOptions"
        @update:model-value="setScope"
      />
    </template>

    <div v-if="list === undefined" class="space-y-3" data-testid="dashboard-planned-skeleton">
      <BaseSkeleton v-for="i in 3" :key="i" height-class="h-10" />
    </div>

    <p v-else-if="list.items.length === 0" class="text-sm text-fg-muted">
      {{ t('dashboard.plannedTasks.empty') }}
    </p>

    <ul v-else class="-mx-2 space-y-1">
      <li v-for="task in list.items" :key="task.id">
        <Link
          :href="`/planning?task=${task.id}`"
          data-testid="dashboard-planned-row"
          :aria-label="t('dashboard.plannedTasks.open', { title: task.title, boat: task.boatName })"
          class="flex min-h-11 items-start justify-between gap-3 rounded-(--radius-control) px-2 py-2 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <span class="min-w-0">
            <span class="block truncate text-sm text-fg">
              <span class="font-semibold">{{ task.boatName }}</span>
              <span class="text-fg-muted"> · {{ task.title }}</span>
            </span>
            <span class="mt-0.5 block text-xs text-fg-subtle">
              {{ maintenanceSubjectLabel(t, task.subject) ?? task.subject }}
            </span>
          </span>
          <span class="shrink-0 text-xs font-medium text-fg-muted">
            {{ formatDate(task.dueAt) }}
          </span>
        </Link>
      </li>
    </ul>

    <template v-if="list && list.total > list.items.length" #footer>
      <p class="text-xs text-fg-subtle" data-testid="dashboard-planned-more">
        {{
          t('dashboard.plannedTasks.more', {
            count: String(list.total - list.items.length),
          })
        }}
      </p>
    </template>
  </BaseCard>
</template>
