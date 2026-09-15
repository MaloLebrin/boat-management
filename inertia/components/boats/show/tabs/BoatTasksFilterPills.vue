<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '~/composables/use_t'

export type BoatTasksFilter = 'all' | 'overdue' | 'soon' | 'planned' | 'undated'

/** Pastilles de filtre de l'onglet Tâches, avec le nombre de tâches par groupe. */
const props = defineProps<{
  counts: Record<Exclude<BoatTasksFilter, 'all'>, number>
}>()

const filter = defineModel<BoatTasksFilter>({ required: true })

const { t } = useT()

const pills = computed<Array<{ key: BoatTasksFilter; label: string; count?: number }>>(() => [
  { key: 'all', label: t('boats.show.tasksFilter.all') },
  { key: 'overdue', label: t('boats.show.tasksFilter.overdue'), count: props.counts.overdue },
  { key: 'soon', label: t('boats.show.tasksFilter.soon'), count: props.counts.soon },
  { key: 'planned', label: t('boats.show.tasksFilter.planned'), count: props.counts.planned },
  { key: 'undated', label: t('boats.show.tasksFilter.undated'), count: props.counts.undated },
])
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="pill in pills"
      :key="pill.key"
      type="button"
      :class="[
        'rounded-full px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-2',
        filter === pill.key
          ? 'bg-brand text-white'
          : 'bg-surface-muted text-fg-muted hover:bg-surface-elevated hover:text-fg',
      ]"
      @click="filter = pill.key"
    >
      {{ pill.label }}
      <span
        v-if="pill.count !== undefined && pill.count > 0"
        :class="[
          'rounded-full px-2 py-0.5 text-xs font-semibold',
          filter === pill.key ? 'bg-white/20' : 'bg-surface-elevated',
        ]"
      >
        {{ pill.count }}
      </span>
    </button>
  </div>
</template>
