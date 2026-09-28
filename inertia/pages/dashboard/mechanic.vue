<script setup lang="ts">
import { Head, usePage } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseSegmentedControl from '~/components/base/BaseSegmentedControl.vue'
import BaseStatCard from '~/components/base/BaseStatCard.vue'
import MechanicInterventionRow from '~/components/dashboard/MechanicInterventionRow.vue'
import type { PlanningTask } from '#shared/types/planning'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  overdueTasks: PlanningTask[]
  soonTasks: PlanningTask[]
}>()

const { t } = useT()
const page = usePage()

// « Mes tâches » (#868) : celles qui me sont confiées. C'est la vue par défaut
// dès qu'on m'en a confié une ; sans assignation dans l'organisation, le
// mécanicien garde la vue de toute la flotte.
const currentUserId = computed(() => (page.props.user as { id: number } | undefined)?.id ?? null)
const isMine = (task: PlanningTask) =>
  currentUserId.value !== null && task.assignee?.id === currentUserId.value
const hasAssignedTasks = [...props.overdueTasks, ...props.soonTasks].some(isMine)

const scope = ref<'mine' | 'all'>(hasAssignedTasks ? 'mine' : 'all')
const scopeOptions = computed(() => [
  { value: 'mine', label: t('dashboard.mechanic.scope.mine') },
  { value: 'all', label: t('dashboard.mechanic.scope.all') },
])

const visibleOverdue = computed(() =>
  scope.value === 'mine' ? props.overdueTasks.filter(isMine) : props.overdueTasks
)
const visibleSoon = computed(() =>
  scope.value === 'mine' ? props.soonTasks.filter(isMine) : props.soonTasks
)

const overdueCount = computed(() => visibleOverdue.value.length)
const upcomingCount = computed(() => visibleSoon.value.length)
</script>

<template>
  <Head :title="t('dashboard.mechanic.title')" />

  <div class="w-full max-w-5xl px-6 py-10 sm:px-8">
    <BaseAlert v-if="overdueCount > 0" variant="warning" styled="bordered" class="mb-6">
      <span class="flex flex-wrap items-center gap-2">
        <span class="font-semibold">{{
          t('dashboard.mechanic.overdueAlert', { count: String(overdueCount) })
        }}</span>
      </span>
    </BaseAlert>

    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-fg">
          {{ t('dashboard.mechanic.title') }}
        </h1>
        <p class="mt-2 text-base text-fg-muted">{{ t('dashboard.mechanic.subtitle') }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <BaseButton variant="secondary" route="maintenance.history">
          {{ t('dashboard.mechanic.viewHistory') }}
        </BaseButton>
        <BaseButton variant="primary" route="planning.index">
          {{ t('dashboard.mechanic.viewPlanning') }}
        </BaseButton>
      </div>
    </div>

    <BaseSegmentedControl
      class="mt-6"
      :model-value="scope"
      :options="scopeOptions"
      @update:model-value="scope = $event === 'mine' ? 'mine' : 'all'"
    />

    <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BaseStatCard
        :label="t('dashboard.mechanic.stats.overdue')"
        :value="String(overdueCount)"
        :tone="overdueCount > 0 ? 'warning' : 'success'"
        href="/planning"
      />
      <BaseStatCard
        :label="t('dashboard.mechanic.stats.upcoming')"
        :value="String(upcomingCount)"
        :tone="upcomingCount > 0 ? 'info' : 'neutral'"
        href="/planning"
      />
    </div>

    <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <BaseCard>
        <template #header>
          <h2 class="text-sm font-semibold text-fg">{{ t('dashboard.mechanic.overdueTitle') }}</h2>
        </template>

        <div v-if="visibleOverdue.length === 0" class="text-sm text-fg-muted">
          {{ t('dashboard.mechanic.overdueEmpty') }}
        </div>
        <ul v-else class="space-y-3">
          <MechanicInterventionRow
            v-for="task in visibleOverdue"
            :key="task.id"
            :task="task"
            tone="overdue"
          />
        </ul>
      </BaseCard>

      <BaseCard>
        <template #header>
          <h2 class="text-sm font-semibold text-fg">{{ t('dashboard.mechanic.upcomingTitle') }}</h2>
        </template>

        <div v-if="visibleSoon.length === 0" class="text-sm text-fg-muted">
          {{ t('dashboard.mechanic.upcomingEmpty') }}
        </div>
        <ul v-else class="space-y-3">
          <MechanicInterventionRow
            v-for="task in visibleSoon"
            :key="task.id"
            :task="task"
            tone="soon"
          />
        </ul>
      </BaseCard>
    </div>
  </div>
</template>
