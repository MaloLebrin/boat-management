<script setup lang="ts">
import { router, usePage } from '@inertiajs/vue3'
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import BasePagination from '~/components/base/BasePagination.vue'
import MaintenanceHistoryToolbar from '~/components/maintenance/MaintenanceHistoryToolbar.vue'
import MaintenanceHistoryTimeline from '~/components/maintenance/MaintenanceHistoryTimeline.vue'
import type {
  MaintenanceBoatOption,
  MaintenanceHistoryFilters,
  MaintenanceHistoryPaginated,
  MaintenanceHistoryStats,
} from '#shared/types/maintenance'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  events: MaintenanceHistoryPaginated
  stats: MaintenanceHistoryStats
  filters: MaintenanceHistoryFilters
  boatOptions: MaintenanceBoatOption[]
  canExport: boolean
}>()

const { t } = useT()

const page = usePage()
const isLoading = computed(() => page.props?.processing === true)

const eventRows = computed(() => props.events.data)

const pdfHref = computed(() => {
  const params = new URLSearchParams()
  if (props.filters.q) params.set('q', props.filters.q)
  if (props.filters.subject) params.set('subject', props.filters.subject)
  if (props.filters.boatId) params.set('boatId', String(props.filters.boatId))
  if (props.filters.dateFrom) params.set('dateFrom', props.filters.dateFrom)
  if (props.filters.dateTo) params.set('dateTo', props.filters.dateTo)
  params.set('sort', props.filters.sort)
  const qs = params.toString()
  return `/maintenance/history.pdf${qs ? `?${qs}` : ''}`
})

function navigate(next: MaintenanceHistoryFilters) {
  router.get(
    '/maintenance/history',
    {
      q: next.q || undefined,
      subject: next.subject || undefined,
      boatId: next.boatId ?? undefined,
      dateFrom: next.dateFrom || undefined,
      dateTo: next.dateTo || undefined,
      sort: next.sort,
      page: next.page,
      perPage: next.perPage,
    },
    { preserveScroll: true, preserveState: true, replace: true }
  )
}

function reset() {
  navigate({
    q: '',
    subject: '',
    boatId: null,
    dateFrom: '',
    dateTo: '',
    sort: props.filters.sort,
    page: 1,
    perPage: props.filters.perPage,
  })
}
</script>

<template>
  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <!-- Header -->
    <header class="space-y-4">
      <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <BaseHeading level="1">{{ t('maintenance.history.title') }}</BaseHeading>
          <p class="mt-2 text-fg-muted">{{ t('maintenance.history.subtitle') }}</p>
        </div>
        <a v-if="canExport" :href="pdfHref" target="_blank" rel="noopener">
          <BaseButton variant="secondary" size="sm" type="button">
            {{ t('maintenance.history.exportPdf') }}
          </BaseButton>
        </a>
      </div>
    </header>

    <!-- Filter bar -->
    <MaintenanceHistoryToolbar
      :filters="filters"
      :boat-options="boatOptions"
      :total="events.meta.total"
      :is-loading="isLoading"
      @update:filters="navigate"
      @reset="reset"
    />

    <!-- Stats strip -->
    <div class="mt-6 grid grid-cols-3 gap-4">
      <div class="rounded-lg border border-border bg-surface-elevated p-4 text-center">
        <p class="text-2xl font-bold text-fg">{{ stats.totalEvents }}</p>
        <p class="text-sm text-fg-muted">{{ t('maintenance.history.stats.events') }}</p>
      </div>
      <div class="rounded-lg border border-border bg-surface-elevated p-4 text-center">
        <p class="text-2xl font-bold text-fg">{{ stats.totalParts }}</p>
        <p class="text-sm text-fg-muted">{{ t('maintenance.history.stats.partsChanged') }}</p>
      </div>
      <div class="rounded-lg border border-border bg-surface-elevated p-4 text-center">
        <p class="text-2xl font-bold text-fg">{{ stats.totalBoats }}</p>
        <p class="text-sm text-fg-muted">{{ t('maintenance.history.stats.boats') }}</p>
      </div>
    </div>

    <!-- Timeline -->
    <div class="mt-8">
      <BaseEmptyState
        v-if="eventRows.length === 0"
        :title="t('maintenance.history.empty.title')"
        :description="t('maintenance.history.empty.description')"
        :action-label="t('maintenance.history.empty.action')"
        @action="router.visit('/boats')"
      />

      <MaintenanceHistoryTimeline v-else :events="eventRows" />
    </div>

    <!-- Pagination -->
    <div v-if="eventRows.length && events.meta.lastPage > 1" class="mt-8">
      <BasePagination
        :page="events.meta.currentPage"
        :page-count="events.meta.lastPage"
        @update:page="(p) => navigate({ ...filters, page: p })"
      />
    </div>
  </div>
</template>
