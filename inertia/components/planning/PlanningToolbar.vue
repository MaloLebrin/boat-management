<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import { parseAssigneeFilter, type TaskAssigneeFilter } from '~/utils/task_assignee_filter'

/**
 * Barre d'outils du planning : filtres (assigné, bateau), couche
 * réservations (#869), groupement et bascule kanban / calendrier.
 */
const props = defineProps<{
  assigneeFilterOptions: Array<{ label: string; value: string | number }>
  showAssigneeFilter: boolean
  boatOptions: Array<{ id: number; name: string }>
  canGroupTasks: boolean
  hasReservations: boolean
}>()

const assigneeFilter = defineModel<TaskAssigneeFilter>('assigneeFilter', { required: true })
const boatFilter = defineModel<number | 'all'>('boatFilter', { required: true })
const showReservations = defineModel<boolean>('showReservations', { required: true })
const groupingEnabled = defineModel<boolean>('groupingEnabled', { required: true })
const viewMode = defineModel<'kanban' | 'calendar'>('viewMode', { required: true })

const { t } = useT()

const boatFilterOptions = computed(() => [
  { label: t('planning.boatFilter.all'), value: 'all' },
  ...props.boatOptions.map((boat) => ({ label: boat.name, value: boat.id })),
])

function parseBoatFilter(raw: string | number): number | 'all' {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : 'all'
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <div v-if="showAssigneeFilter" class="w-48">
      <label for="planning-assignee-filter" class="sr-only">
        {{ t('planning.assigneeFilter.label') }}
      </label>
      <BaseSelect
        id="planning-assignee-filter"
        :options="assigneeFilterOptions"
        :model-value="assigneeFilter"
        @update:model-value="assigneeFilter = parseAssigneeFilter($event)"
      />
    </div>

    <div v-if="boatOptions.length > 1" class="w-48">
      <label for="planning-boat-filter" class="sr-only">
        {{ t('planning.boatFilter.label') }}
      </label>
      <BaseSelect
        id="planning-boat-filter"
        :options="boatFilterOptions"
        :model-value="boatFilter"
        @update:model-value="boatFilter = parseBoatFilter($event)"
      />
    </div>

    <!-- Couche réservations (#869) -->
    <BaseButton
      v-if="hasReservations"
      variant="ghost"
      size="sm"
      :aria-pressed="showReservations ? 'true' : 'false'"
      :class="[
        'border transition-colors',
        showReservations
          ? 'border-mint-600 bg-mint-50 text-mint-700'
          : 'border-border bg-surface text-fg-muted hover:text-fg',
      ]"
      data-testid="planning-reservations-toggle"
      @click="showReservations = !showReservations"
    >
      {{ t('planning.reservations.toggle') }}
    </BaseButton>

    <!-- Grouping toggle (Pro+) -->
    <BaseButton
      v-if="canGroupTasks"
      variant="ghost"
      size="sm"
      :title="t('planning.grouping.toggleTitle')"
      :class="[
        'gap-1.5 border transition-colors',
        groupingEnabled
          ? 'border-brand bg-brand-soft text-brand'
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
</template>
