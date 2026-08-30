<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import type {
  EngineListBoatOption,
  EngineListDirection,
  EngineListFilters,
  EngineListSort,
} from '#shared/types/engine'
import { useT } from '~/composables/use_t'
import { useBoatOptions } from '~/composables/use_boat_options'

const { t } = useT()
const { engineKindOptions, engineFamilyOptions } = useBoatOptions()

const props = defineProps<{
  filters: EngineListFilters
  viewMode: 'table' | 'cards'
  total: number
  isLoading?: boolean
  boatOptions: EngineListBoatOption[]
}>()

const emit = defineEmits<{
  (e: 'update:viewMode', value: 'table' | 'cards'): void
  (e: 'update:filters', value: EngineListFilters): void
  (e: 'reset'): void
}>()

const viewTabs = computed(() => [
  { key: 'table', label: t('engines.list.viewTable') },
  { key: 'cards', label: t('engines.list.viewCards') },
])

const sortOptions = computed<Array<{ label: string; value: EngineListSort }>>(() => [
  { label: t('engines.list.recent'), value: 'recent' },
  { label: t('engines.list.brand'), value: 'brand' },
  { label: t('engines.list.hours'), value: 'hours' },
])

const directionOptions = computed<Array<{ label: string; value: EngineListDirection }>>(() => [
  { label: t('engines.list.asc'), value: 'asc' },
  { label: t('engines.list.desc'), value: 'desc' },
])

const boatSelectOptions = computed(() =>
  props.boatOptions.map((boat) => ({ label: boat.name, value: String(boat.id) }))
)

// Statuts d'équipement (`equipmentStatuses` côté validateur) : mêmes libellés
// que les formulaires moteur de la fiche bateau.
const statusOptions = computed(() => [
  { label: t('equipment.status.operational'), value: 'operational' },
  { label: t('equipment.status.in_maintenance'), value: 'in_maintenance' },
  { label: t('equipment.status.out_of_service'), value: 'out_of_service' },
  { label: t('equipment.status.retired'), value: 'retired' },
])

const qDraft = ref(props.filters.q ?? '')

const hasActiveFilters = computed(
  () =>
    Boolean(props.filters.q?.trim()) ||
    props.filters.boatId > 0 ||
    Boolean(props.filters.kind) ||
    Boolean(props.filters.status) ||
    Boolean(props.filters.family)
)

watch(
  () => props.filters.q,
  (value) => {
    qDraft.value = value ?? ''
  }
)

const emitSearch = useDebounceFn((value: string) => {
  update({ q: value, page: 1 })
}, 300)

function onSearchInput(value: string) {
  qDraft.value = value
  emitSearch(value)
}

function update(partial: Partial<EngineListFilters>) {
  emit('update:filters', { ...props.filters, ...partial })
}
</script>

<template>
  <div class="mt-8 space-y-4">
    <div class="grid gap-3 md:grid-cols-12 md:items-end">
      <div class="md:col-span-5">
        <BaseInput
          :model-value="qDraft"
          :label="t('engines.list.search')"
          inputmode="search"
          :placeholder="t('engines.list.searchPlaceholder')"
          @update:model-value="onSearchInput"
        />
      </div>

      <div class="grid gap-2 sm:grid-cols-2 md:col-span-7 md:grid-cols-4">
        <BaseSelect
          v-if="boatSelectOptions.length > 1"
          :label="t('engines.list.boat')"
          allow-empty
          :placeholder="t('common.all')"
          :model-value="filters.boatId ? String(filters.boatId) : ''"
          :options="boatSelectOptions"
          @update:model-value="(v) => update({ boatId: Number(v || 0), page: 1 })"
        />
        <BaseSelect
          :label="t('engines.list.kind')"
          allow-empty
          :placeholder="t('common.all')"
          :model-value="filters.kind"
          :options="engineKindOptions"
          @update:model-value="(v) => update({ kind: String(v || ''), page: 1 })"
        />
        <BaseSelect
          :label="t('engines.list.family')"
          allow-empty
          :placeholder="t('common.all')"
          :model-value="filters.family"
          :options="engineFamilyOptions"
          @update:model-value="(v) => update({ family: String(v || ''), page: 1 })"
        />
        <BaseSelect
          :label="t('engines.list.status')"
          allow-empty
          :placeholder="t('common.all')"
          :model-value="filters.status"
          :options="statusOptions"
          @update:model-value="(v) => update({ status: String(v || ''), page: 1 })"
        />
      </div>
    </div>

    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="flex flex-wrap items-center gap-2">
        <BaseTabs
          :model-value="viewMode"
          :tabs="viewTabs"
          @update:model-value="(v) => emit('update:viewMode', v as 'table' | 'cards')"
        />
        <p class="text-sm text-fg-muted">
          <span class="font-semibold text-fg">{{ total }}</span>
          {{ t('engines.list.engines', { count: String(total) }) }}
          <span v-if="isLoading" class="ml-2 inline-block text-fg-subtle">
            {{ t('common.loading') }}
          </span>
        </p>
      </div>

      <div class="grid gap-2 sm:grid-cols-3 md:w-auto md:justify-end">
        <BaseSelect
          :label="t('engines.list.sort')"
          :model-value="filters.sort"
          :options="sortOptions"
          @update:model-value="(v) => update({ sort: v as EngineListSort, page: 1 })"
        />
        <BaseSelect
          :label="t('engines.list.direction')"
          :model-value="filters.direction"
          :options="directionOptions"
          @update:model-value="(v) => update({ direction: v as EngineListDirection, page: 1 })"
        />
        <div class="flex items-end justify-end">
          <BaseButton
            v-if="hasActiveFilters"
            variant="ghost"
            size="sm"
            type="button"
            @click="emit('reset')"
          >
            {{ t('engines.list.clearFilters') }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
