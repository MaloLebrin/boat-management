<script setup lang="ts">
import { ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSegmentedControl from '~/components/base/BaseSegmentedControl.vue'
import { useT } from '~/composables/use_t'
import type { InventoryFilter } from '#shared/types/inventory'

/** Recherche et filtre « stock bas » de l'inventaire (#892), portés par l'URL. */
const props = defineProps<{
  filters: { q: string; filter: InventoryFilter }
  lowCount: number
}>()

const { t } = useT()
const q = ref(props.filters.q)

function visit(filter: InventoryFilter) {
  router.get(
    '/inventory',
    { q: q.value.trim() || undefined, filter: filter === 'all' ? undefined : filter },
    { preserveScroll: true, preserveState: true, replace: true }
  )
}

const filterOptions = [
  { value: 'all', label: t('inventory.filters.all') },
  { value: 'low', label: t('inventory.filters.low', { count: String(props.lowCount) }) },
]
</script>

<template>
  <form
    class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
    @submit.prevent="visit(filters.filter)"
  >
    <div class="w-full sm:max-w-sm">
      <BaseInput
        v-model="q"
        type="search"
        :label="t('inventory.filters.search')"
        :placeholder="t('inventory.filters.searchPlaceholder')"
      />
    </div>
    <BaseSegmentedControl
      :model-value="filters.filter"
      :options="filterOptions"
      @update:model-value="visit($event as InventoryFilter)"
    />
  </form>
</template>
