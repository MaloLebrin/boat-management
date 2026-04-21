<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import { useDebounceFn } from '@vueuse/core'
import type { BoatListDirection, BoatListFilters, BoatListSort } from './types'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  filters: BoatListFilters
  viewMode: 'table' | 'cards'
  total: number
  isLoading?: boolean
  typeOptions: Array<{ label: string; value: string }>
  propulsionOptions: Array<{ label: string; value: string }>
}>()

const emit = defineEmits<{
  (e: 'update:viewMode', value: 'table' | 'cards'): void
  (e: 'update:filters', value: BoatListFilters): void
  (e: 'reset'): void
}>()

const viewTabs = computed(() => [
  { key: 'table', label: 'Table' },
  { key: 'cards', label: 'Cards' },
])

const sortOptions: Array<{ label: string; value: BoatListSort }> = [
  { label: 'Recent', value: 'recent' },
  { label: 'Name', value: 'name' },
]

const directionOptions: Array<{ label: string; value: BoatListDirection }> = [
  { label: 'Asc', value: 'asc' },
  { label: 'Desc', value: 'desc' },
]

const qDraft = ref(props.filters.q ?? '')

watch(
  () => props.filters.q,
  (value) => {
    qDraft.value = value ?? ''
  }
)

const emitSearch = useDebounceFn((value: string) => {
  update({ q: value || undefined, page: 1 })
}, 300)

function onSearchInput(value: string) {
  qDraft.value = value
  emitSearch(value)
}

function update(partial: Partial<BoatListFilters>) {
  emit('update:filters', { ...props.filters, ...partial })
}
</script>

<template>
  <div class="mt-8 space-y-4">
    <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div class="flex-1">
        <BaseInput
          :model-value="qDraft"
          label="Search"
          inputmode="search"
          placeholder="Search by name or registration…"
          @update:model-value="onSearchInput"
        >
          <template #trailing>
            <svg class="h-4 w-4 text-fg-subtle" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fill-rule="evenodd"
                d="M9 3.5a5.5 5.5 0 1 0 3.559 9.692l2.624 2.624a.75.75 0 1 0 1.06-1.06l-2.624-2.624A5.5 5.5 0 0 0 9 3.5Zm-4 5.5a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
                clip-rule="evenodd"
              />
            </svg>
          </template>
        </BaseInput>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div class="min-w-48">
          <BaseSelect
            label="Type"
            allow-empty
            placeholder="All"
            :model-value="filters.type ?? ''"
            :options="typeOptions"
            @update:model-value="(v) => update({ type: String(v || '') || undefined, page: 1 })"
          />
        </div>
        <div class="min-w-48">
          <BaseSelect
            label="Propulsion"
            allow-empty
            placeholder="All"
            :model-value="filters.propulsionType ?? ''"
            :options="propulsionOptions"
            @update:model-value="(v) => update({ propulsionType: String(v || '') || undefined, page: 1 })"
          />
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-wrap items-center gap-2">
        <BaseTabs
          :model-value="viewMode"
          :tabs="viewTabs"
          @update:model-value="(v) => emit('update:viewMode', v as any)"
        />
        <p class="text-sm text-fg-muted">
          <span class="font-semibold text-fg">{{ total }}</span>
          boats
          <span v-if="isLoading" class="ml-2 inline-block text-fg-subtle">Loading…</span>
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2 justify-end">
        <div class="min-w-40">
          <BaseSelect
            label="Sort"
            :model-value="filters.sort"
            :options="sortOptions"
            @update:model-value="(v) => update({ sort: v as any, page: 1 })"
          />
        </div>
        <div class="min-w-32">
          <BaseSelect
            label="Direction"
            :model-value="filters.direction"
            :options="directionOptions"
            @update:model-value="(v) => update({ direction: v as any, page: 1 })"
          />
        </div>
        <BaseButton variant="secondary" size="sm" type="button" @click="emit('reset')">
          Reset
        </BaseButton>
      </div>
    </div>
  </div>
</template>

