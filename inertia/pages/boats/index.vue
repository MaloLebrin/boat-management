<script setup lang="ts">
import { router, usePage } from '@inertiajs/vue3'
import { LockClosedIcon } from '@heroicons/vue/24/outline'
import { useLocalStorage } from '@vueuse/core'
import { computed } from 'vue'
import { toast } from 'vue-sonner'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BoatCards from '~/components/boats/list/BoatCards.vue'
import BoatListToolbar from '~/components/boats/list/BoatListToolbar.vue'
import BoatPagination from '~/components/boats/list/BoatPagination.vue'
import BoatTable from '~/components/boats/list/BoatTable.vue'
import type { BoatListFilters, BoatsPaginated } from '~/components/boats/list/types'
import { useT } from '~/composables/useT'

const { t } = useT()

const props = defineProps<{
  boats: BoatsPaginated
  filters: BoatListFilters
  canAddBoat: boolean
}>()

function handleNewBoat() {
  if (props.canAddBoat) {
    router.visit('/boats/new')
  } else {
    toast.error(t('boats.index.quotaReached'))
  }
}

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
  navigate({
    q: undefined,
    type: undefined,
    propulsionType: undefined,
    sort: props.filters.sort,
    direction: props.filters.direction,
    page: 1,
    perPage: props.filters.perPage,
  })
}
</script>

<template>
  <div class="w-full max-w-7xl flex-col px-6 py-10 sm:px-8">
    <div class="flex items-center justify-between">
      <div>
        <BaseHeading level="1">{{ t('boats.index.title') }}</BaseHeading>
        <p class="mt-2 text-base text-fg-muted">{{ t('boats.index.subtitle') }}</p>
      </div>
      <BaseButton variant="primary" @click="handleNewBoat">
        <LockClosedIcon v-if="!canAddBoat" class="mr-1.5 h-4 w-4 opacity-70" />
        {{ t('boats.index.newBoat') }}
      </BaseButton>
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

    <div class="mt-6 flex-1">
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
      </div>

      <div v-else class="mt-8">
        <BaseEmptyState
          :title="t('boats.index.empty.title')"
          :description="t('boats.index.empty.description')"
          :action-label="t('boats.index.empty.action')"
          @action="handleNewBoat"
        />
      </div>
    </div>

    <div v-if="boatsData.length && boats.meta.lastPage > 1" class="sticky bottom-0 mt-6">
      <BoatPagination :meta="boats.meta" @update:page="(p) => navigate({ ...filters, page: p })" />
    </div>
  </div>
</template>

