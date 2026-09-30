<script setup lang="ts">
import { Head, router, usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { useLocalStorage } from '@vueuse/core'
import { computed, ref } from 'vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BoatCards from '~/components/boats/list/BoatCards.vue'
import BoatListToolbar from '~/components/boats/list/BoatListToolbar.vue'
import BoatPagination from '~/components/boats/list/BoatPagination.vue'
import BoatTable from '~/components/boats/list/BoatTable.vue'
import NewBoatButton from '~/components/boats/NewBoatButton.vue'
import UpgradePlanModal from '~/components/base/UpgradePlanModal.vue'
import type { BoatListFilters, BoatsPaginated } from '~/components/boats/list/types'
import type { QuotaUsage } from '../../../shared/types/plan'
import { useT } from '~/composables/use_t'
import { usePermissions } from '~/composables/use_permissions'
import { propulsionLabel } from '~/utils/boat_enum_labels'
import { useBoatOptions } from '~/composables/use_boat_options'

const { t } = useT()
const { can } = usePermissions()
// Le filtre s'appuie sur le vocabulaire fermé `BOAT_CATEGORIES` (#571) et non
// plus sur les valeurs distinctes de la page courante : « Voilier », « voilier »
// et « Voilier monocoque » donnaient trois filtres pour la même chose.
const { categoryOptions } = useBoatOptions()

const props = defineProps<{
  boats: BoatsPaginated
  filters: BoatListFilters
  canAddBoat: boolean
  boatQuota: QuotaUsage['boats']
}>()

const showUpgradeModal = ref(false)

function handleNewBoat() {
  if (props.canAddBoat) {
    router.visit('/boats/new')
  } else {
    showUpgradeModal.value = true
  }
}

const boatsData = computed(() => props.boats.data)

const page = usePage()
const isLoading = computed(() => page.props?.processing === true)

const VIEW_MODE_KEY = 'boats.index.viewMode'
const viewMode = useLocalStorage<'table' | 'cards'>(VIEW_MODE_KEY, 'table')

const propulsionOptions = computed(() => {
  const set = new Set<string>()
  for (const b of boatsData.value) if (b.propulsionType) set.add(b.propulsionType)
  return Array.from(set)
    .sort((a, b) => a.localeCompare(b))
    .map((v) => ({ label: propulsionLabel(t, v) ?? v, value: v }))
})

function navigate(next: BoatListFilters) {
  router.get(
    '/boats',
    {
      q: next.q || undefined,
      category: next.category || undefined,
      propulsionType: next.propulsionType || undefined,
      status: next.status || undefined,
      trashed: next.trashed ? '1' : undefined,
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
    category: undefined,
    propulsionType: undefined,
    status: undefined,
    trashed: props.filters.trashed,
    sort: props.filters.sort,
    direction: props.filters.direction,
    page: 1,
    perPage: props.filters.perPage,
  })
}
</script>

<template>
  <Head :title="filters.trashed ? t('boats.trash.title') : t('boats.index.title')" />

  <div class="w-full max-w-7xl flex-col px-6 py-10 sm:px-8">
    <div class="flex items-center justify-between gap-4">
      <div>
        <BaseHeading level="1">{{
          filters.trashed ? t('boats.trash.title') : t('boats.index.title')
        }}</BaseHeading>
        <p class="mt-2 text-base text-fg-muted">
          {{ filters.trashed ? t('boats.trash.subtitle') : t('boats.index.subtitle') }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <Link
          v-if="filters.trashed"
          href="/boats"
          class="text-sm font-semibold text-fg-muted hover:text-fg hover:underline"
        >
          {{ t('boats.trash.back') }}
        </Link>
        <Link
          v-else-if="can('boats.delete')"
          href="/boats?trashed=1"
          class="text-sm font-semibold text-fg-muted hover:text-fg hover:underline"
        >
          {{ t('boats.trash.open') }}
        </Link>
        <NewBoatButton v-if="!filters.trashed" :can-add-boat="canAddBoat" :quota="boatQuota" />
      </div>
    </div>

    <BoatListToolbar
      :filters="filters"
      :view-mode="viewMode"
      :total="boats.meta.total"
      :is-loading="isLoading"
      :category-options="categoryOptions"
      :propulsion-options="propulsionOptions"
      @update:view-mode="(v) => (viewMode = v)"
      @update:filters="navigate"
      @reset="reset"
    />

    <div class="mt-6 flex-1">
      <div v-if="boatsData.length">
        <div class="hidden md:block" v-if="viewMode === 'table'">
          <BoatTable :boats="boatsData" :trashed="filters.trashed" />
        </div>

        <div class="block md:hidden">
          <BoatCards :boats="boatsData" :trashed="filters.trashed" />
        </div>

        <div class="hidden md:block" v-if="viewMode === 'cards'">
          <BoatCards :boats="boatsData" :trashed="filters.trashed" />
        </div>
      </div>

      <div v-else class="mt-8">
        <BaseEmptyState
          v-if="filters.trashed"
          :title="t('boats.trash.empty.title')"
          :description="t('boats.trash.empty.description')"
        />
        <BaseEmptyState
          v-else
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

  <UpgradePlanModal v-model:open="showUpgradeModal" feature="boats" />
</template>
