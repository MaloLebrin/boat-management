<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import type {
  MaintenanceBoatOption,
  MaintenanceHistoryFilters,
  MaintenanceHistorySort,
  MaintenanceTaskSubject,
} from '#shared/types/maintenance'
import { useT } from '~/composables/use_t'

const { t } = useT()

const props = defineProps<{
  filters: MaintenanceHistoryFilters
  boatOptions: MaintenanceBoatOption[]
  total: number
  isLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:filters', value: MaintenanceHistoryFilters): void
  (e: 'reset'): void
}>()

const SUBJECTS: MaintenanceTaskSubject[] = [
  'boat',
  'hull',
  'engine',
  'sail',
  'rig',
  'electrical',
  'plumbing',
  'safety',
  'deck',
  'other',
]

const subjectOptions = computed(() =>
  SUBJECTS.map((s) => ({ value: s, label: t(`maintenance.history.filters.${s}`) }))
)

const boatSelectOptions = computed(() =>
  props.boatOptions.map((b) => ({ value: String(b.id), label: b.name }))
)

const sortOptions = computed<Array<{ label: string; value: MaintenanceHistorySort }>>(() => [
  { label: t('maintenance.history.filterBar.sortRecent'), value: 'recent' },
  { label: t('maintenance.history.filterBar.sortOldest'), value: 'oldest' },
])

const qDraft = ref(props.filters.q ?? '')

watch(
  () => props.filters.q,
  (value) => {
    qDraft.value = value ?? ''
  }
)

const hasActiveFilters = computed(
  () =>
    Boolean(props.filters.q?.trim()) ||
    Boolean(props.filters.subject) ||
    props.filters.boatId !== null ||
    Boolean(props.filters.dateFrom) ||
    Boolean(props.filters.dateTo)
)

const emitSearch = useDebounceFn((value: string) => {
  update({ q: value.trim(), page: 1 })
}, 300)

function onSearchInput(value: string) {
  qDraft.value = value
  emitSearch(value)
}

function update(partial: Partial<MaintenanceHistoryFilters>) {
  emit('update:filters', { ...props.filters, ...partial })
}
</script>

<template>
  <div class="mt-8 space-y-4">
    <div class="grid gap-3 md:grid-cols-12 md:items-end">
      <div class="md:col-span-4">
        <BaseInput
          :model-value="qDraft"
          :label="t('maintenance.history.filterBar.subjectLabel')"
          inputmode="search"
          :placeholder="t('maintenance.history.searchPlaceholder')"
          @update:model-value="onSearchInput"
        />
      </div>
      <div class="md:col-span-4">
        <BaseSelect
          :label="t('maintenance.history.filterBar.boatLabel')"
          allow-empty
          :placeholder="t('maintenance.history.filterBar.allBoats')"
          :model-value="filters.boatId !== null ? String(filters.boatId) : ''"
          :options="boatSelectOptions"
          @update:model-value="
            (v) => update({ boatId: v ? Number.parseInt(String(v), 10) : null, page: 1 })
          "
        />
      </div>
      <div class="md:col-span-4">
        <BaseSelect
          :label="t('maintenance.history.filterBar.subjectLabel')"
          allow-empty
          :placeholder="t('maintenance.history.filters.all')"
          :model-value="filters.subject"
          :options="subjectOptions"
          @update:model-value="(v) => update({ subject: (v || '') as any, page: 1 })"
        />
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-12 md:items-end">
      <div class="md:col-span-3">
        <BaseInput
          type="date"
          :label="t('maintenance.history.filterBar.dateFrom')"
          :model-value="filters.dateFrom"
          @update:model-value="(v) => update({ dateFrom: v, page: 1 })"
        />
      </div>
      <div class="md:col-span-3">
        <BaseInput
          type="date"
          :label="t('maintenance.history.filterBar.dateTo')"
          :model-value="filters.dateTo"
          @update:model-value="(v) => update({ dateTo: v, page: 1 })"
        />
      </div>
      <div class="md:col-span-3">
        <BaseSelect
          :label="t('maintenance.history.filterBar.sortLabel')"
          :model-value="filters.sort"
          :options="sortOptions"
          @update:model-value="(v) => update({ sort: v as any, page: 1 })"
        />
      </div>
      <div class="flex items-end justify-between gap-3 md:col-span-3">
        <p class="text-sm text-fg-muted">
          <span class="font-semibold text-fg">{{
            t('maintenance.history.filterBar.results', { count: String(total) })
          }}</span>
          <span v-if="isLoading" class="ml-2 inline-block text-fg-subtle">{{
            t('common.loading')
          }}</span>
        </p>
        <BaseButton
          v-if="hasActiveFilters"
          variant="ghost"
          size="sm"
          type="button"
          @click="emit('reset')"
        >
          {{ t('maintenance.history.filterBar.reset') }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>
