<script setup lang="ts">
import { router, usePage } from '@inertiajs/vue3'
import { useLocalStorage } from '@vueuse/core'
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BoatCards from '~/components/boats/list/BoatCards.vue'
import BoatListToolbar from '~/components/boats/list/BoatListToolbar.vue'
import BoatPagination from '~/components/boats/list/BoatPagination.vue'
import BoatTable from '~/components/boats/list/BoatTable.vue'
import type { BoatListFilters, BoatsPaginated } from '~/components/boats/list/types'

const props = defineProps<{
  boats: BoatsPaginated
  filters: BoatListFilters
}>()

const boatsData = computed(() => props.boats.data)

const page = usePage()
const isLoading = computed(() => page.props?.processing === true)

const VIEW_MODE_KEY = 'boats.index.viewMode'
const viewMode = useLocalStorage<'table' | 'cards'>(VIEW_MODE_KEY, 'table')

const typeOptions = computed(() => {
  const set = new Set<string>()
  for (const b of boatsData.value) if (b.type) set.add(b.type)
  return Array.from(set)
    .sort((a, b) => a.localeCompare(b))
    .map((v) => ({ label: v, value: v }))
})

const propulsionOptions = computed(() => {
  const set = new Set<string>()
  for (const b of boatsData.value) if (b.propulsionType) set.add(b.propulsionType)
  return Array.from(set)
    .sort((a, b) => a.localeCompare(b))
    .map((v) => ({ label: v, value: v }))
})

function navigate(next: BoatListFilters) {
  router.get(
    '/boats',
    {
      q: next.q || undefined,
      type: next.type || undefined,
      propulsionType: next.propulsionType || undefined,
      sort: next.sort,
      direction: next.direction,
      page: next.page,
      perPage: next.perPage,
    },
    { preserveScroll: true, preserveState: true, replace: true }
  )
}

function reset() {
  navigate({ sort: 'recent', direction: 'desc', page: 1, perPage: props.filters.perPage })
}
</script>

<template>
  <div class="mx-auto w-full px-6 py-10 sm:px-8">
    <div class="flex items-center justify-between">
      <div>
        <BaseHeading level="1">Boats</BaseHeading>
        <p class="mt-2 text-base text-fg-muted">All boats in your organization</p>
      </div>
      <a href="/boats/new">
        <BaseButton variant="primary">New boat</BaseButton>
      </a>
    </div>

    <BoatListToolbar
      :filters="filters"
      :view-mode="viewMode"
      :total="boats.meta.total"
      :is-loading="isLoading"
      :type-options="typeOptions"
      :propulsion-options="propulsionOptions"
      @update:view-mode="(v) => (viewMode = v)"
      @update:filters="navigate"
      @reset="reset"
    />

    <div class="mt-6">
      <div v-if="boatsData.length">
        <div class="hidden md:block" v-if="viewMode === 'table'">
          <BoatTable :boats="boatsData" />
        </div>

        <div class="block md:hidden">
          <BoatCards :boats="boatsData" />
        </div>

        <div class="hidden md:block" v-if="viewMode === 'cards'">
          <BoatCards :boats="boatsData" />
        </div>

        <div class="mt-6">
          <BoatPagination :meta="boats.meta" @update:page="(p) => navigate({ ...filters, page: p })" />
        </div>
      </div>

      <div v-else class="mt-8">
        <BaseEmptyState
          title="Aucun bateau pour l’instant"
          description="Créez votre premier navire pour commencer le suivi."
          action-label="Créer un bateau"
          @action="() => router.visit('/boats/new')"
        />
      </div>
    </div>
  </div>
</template>

