<script setup lang="ts">
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'
import { useListFilters, visitList } from '~/composables/use_list_filters'
import type { ClientListFilters, ClientStatus } from '../../../shared/types/client'

const props = defineProps<{
  filters: ClientListFilters
}>()

const { t } = useT()

const { qDraft, update, onSearchInput } = useListFilters<ClientListFilters>({
  filters: () => props.filters,
  apply: (next) =>
    visitList('/clients', {
      q: next.q,
      status: next.status,
      sort: next.sort,
      direction: next.direction,
      page: next.page,
      perPage: next.perPage,
    }),
})

const statusOptions: Array<{ label: string; value: ClientStatus }> = [
  { label: t('clients.status.active'), value: 'active' },
  { label: t('clients.status.inactive'), value: 'inactive' },
  { label: t('clients.status.blacklisted'), value: 'blacklisted' },
]

function onStatusChange(value: string | number) {
  update({ status: String(value) as ClientStatus | '', page: 1 })
}
</script>

<template>
  <div class="mt-6 grid gap-3 md:grid-cols-12 md:items-end">
    <div class="md:col-span-6">
      <BaseInput
        :model-value="qDraft"
        :placeholder="t('clients.searchPlaceholder')"
        inputmode="search"
        @update:model-value="onSearchInput"
      >
        <template #trailing>
          <svg
            class="h-4 w-4 text-fg-subtle"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 3.559 9.692l2.624 2.624a.75.75 0 1 0 1.06-1.06l-2.624-2.624A5.5 5.5 0 0 0 9 3.5Zm-4 5.5a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
              clip-rule="evenodd"
            />
          </svg>
        </template>
      </BaseInput>
    </div>

    <div class="md:col-span-3">
      <BaseSelect
        :label="t('clients.statusFilter')"
        :model-value="filters.status"
        :options="statusOptions"
        allow-empty
        :placeholder="t('clients.allStatuses')"
        @update:model-value="onStatusChange"
      />
    </div>
  </div>
</template>
