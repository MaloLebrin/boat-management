<script setup lang="ts">
import { Head, router, usePage } from '@inertiajs/vue3'
import { useLocalStorage } from '@vueuse/core'
import { computed } from 'vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BasePagination from '~/components/base/BasePagination.vue'
import EngineCards from '~/components/engines/list/EngineCards.vue'
import EngineListToolbar from '~/components/engines/list/EngineListToolbar.vue'
import EngineSummary from '~/components/engines/list/EngineSummary.vue'
import EngineTable from '~/components/engines/list/EngineTable.vue'
import type {
  EngineListBoatOption,
  EngineListFilters,
  EngineListSummary,
  EnginesPaginated,
} from '#shared/types/engine'
import { useT } from '~/composables/use_t'

const { t } = useT()

const props = defineProps<{
  engines: EnginesPaginated
  filters: EngineListFilters
  boatOptions: EngineListBoatOption[]
  summary: EngineListSummary
}>()

const enginesData = computed(() => props.engines.data)

const page = usePage()
const isLoading = computed(() => page.props?.processing === true)

const VIEW_MODE_KEY = 'engines.index.viewMode'
const viewMode = useLocalStorage<'table' | 'cards'>(VIEW_MODE_KEY, 'table')

/**
 * L'organisation n'a aucun moteur, tous filtres confondus : c'est un état vide
 * de flotte, pas un « aucun résultat » — le message et l'action diffèrent.
 */
const isFleetEmpty = computed(() => props.summary.total === 0)

function navigate(next: EngineListFilters) {
  router.get(
    '/engines',
    {
      q: next.q || undefined,
      boatId: next.boatId || undefined,
      kind: next.kind || undefined,
      status: next.status || undefined,
      family: next.family || undefined,
      sort: next.sort,
      direction: next.direction,
      page: next.page,
      perPage: next.perPage,
    },
    { preserveScroll: true, preserveState: true, replace: true }
  )
}

function reset() {
  navigate({
    ...props.filters,
    q: '',
    boatId: 0,
    kind: '',
    status: '',
    family: '',
    page: 1,
  })
}
</script>

<template>
  <Head :title="t('engines.index.title')" />

  <div class="w-full max-w-7xl flex-col px-6 py-10 sm:px-8">
    <BaseHeading level="1">{{ t('engines.index.title') }}</BaseHeading>
    <p class="mt-2 max-w-3xl text-base text-fg-muted">{{ t('engines.index.subtitle') }}</p>

    <div v-if="!isFleetEmpty" class="mt-6">
      <EngineSummary :summary="summary" />
    </div>

    <EngineListToolbar
      v-if="!isFleetEmpty"
      :filters="filters"
      :view-mode="viewMode"
      :total="engines.meta.total"
      :is-loading="isLoading"
      :boat-options="boatOptions"
      @update:view-mode="(v) => (viewMode = v)"
      @update:filters="navigate"
      @reset="reset"
    />

    <div class="mt-6 flex-1">
      <div v-if="enginesData.length">
        <div v-if="viewMode === 'table'" class="hidden md:block">
          <EngineTable :engines="enginesData" />
        </div>

        <div class="block md:hidden">
          <EngineCards :engines="enginesData" />
        </div>

        <div v-if="viewMode === 'cards'" class="hidden md:block">
          <EngineCards :engines="enginesData" />
        </div>
      </div>

      <div v-else-if="isFleetEmpty" class="mt-8">
        <BaseEmptyState
          :title="t('engines.index.empty.title')"
          :description="t('engines.index.empty.description')"
          :action-label="t('engines.index.empty.action')"
          @action="router.visit('/boats')"
        />
      </div>

      <div v-else class="mt-8">
        <BaseEmptyState
          :title="t('engines.index.noResults.title')"
          :description="t('engines.index.noResults.description')"
          :action-label="t('engines.index.noResults.action')"
          @action="reset"
        />
      </div>
    </div>

    <div v-if="enginesData.length && engines.meta.lastPage > 1" class="sticky bottom-0 mt-6">
      <BasePagination
        :page="engines.meta.currentPage"
        :page-count="engines.meta.lastPage"
        @update:page="(p) => navigate({ ...filters, page: p })"
      />
    </div>
  </div>
</template>
