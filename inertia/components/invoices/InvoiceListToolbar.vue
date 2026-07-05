<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { ref, watch } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'
import type { InvoiceListFilters, InvoiceStatus, InvoiceKind } from '../../../shared/types/invoice'
import type { ClientOption } from '../../../shared/types/client'

const props = defineProps<{
  filters: InvoiceListFilters
  clientOptions: ClientOption[]
}>()

const { t } = useT()

const qDraft = ref(props.filters.q ?? '')

const statusOptions: Array<{ label: string; value: InvoiceStatus }> = [
  { label: t('invoices.status.draft'), value: 'draft' },
  { label: t('invoices.status.sent'), value: 'sent' },
  { label: t('invoices.status.paid'), value: 'paid' },
  { label: t('invoices.status.overdue'), value: 'overdue' },
  { label: t('invoices.status.cancelled'), value: 'cancelled' },
]

const kindOptions: Array<{ label: string; value: InvoiceKind }> = [
  { label: t('invoices.kind.quote'), value: 'quote' },
  { label: t('invoices.kind.invoice'), value: 'invoice' },
]

const clientSelectOptions = props.clientOptions.map((c) => ({
  label: c.fullName,
  value: String(c.id),
}))

watch(
  () => props.filters.q,
  (value) => {
    qDraft.value = value ?? ''
  }
)

function navigate(partial: Partial<InvoiceListFilters>) {
  const next = { ...props.filters, ...partial }
  router.get(
    '/invoices',
    {
      q: next.q || undefined,
      status: next.status || undefined,
      kind: next.kind || undefined,
      clientId: next.clientId || undefined,
      issuedFrom: next.issuedFrom || undefined,
      issuedTo: next.issuedTo || undefined,
      sort: next.sort,
      direction: next.direction,
      page: next.page,
      perPage: next.perPage,
    },
    { preserveScroll: true, preserveState: true, replace: true }
  )
}

const emitSearch = useDebounceFn((value: string) => {
  navigate({ q: value || '', page: 1 })
}, 300)

function onSearchInput(value: string) {
  qDraft.value = value
  emitSearch(value)
}

function onStatusChange(value: string | number) {
  navigate({ status: String(value) as InvoiceStatus | '', page: 1 })
}

function onKindChange(value: string | number) {
  navigate({ kind: String(value) as InvoiceKind | '', page: 1 })
}

function onClientChange(value: string | number) {
  navigate({ clientId: value ? Number(value) : undefined, page: 1 })
}

function onIssuedFromChange(value: string) {
  navigate({ issuedFrom: value || undefined, page: 1 })
}

function onIssuedToChange(value: string) {
  navigate({ issuedTo: value || undefined, page: 1 })
}
</script>

<template>
  <div class="mt-6 grid gap-3 md:grid-cols-12 md:items-end">
    <div class="md:col-span-4">
      <BaseInput
        :model-value="qDraft"
        :placeholder="t('invoices.searchPlaceholder')"
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

    <div class="md:col-span-2">
      <BaseSelect
        :label="t('invoices.filters.status')"
        :model-value="filters.status ?? ''"
        :options="statusOptions"
        allow-empty
        :placeholder="t('invoices.filters.allStatuses')"
        @update:model-value="onStatusChange"
      />
    </div>

    <div class="md:col-span-2">
      <BaseSelect
        :label="t('invoices.filters.kind')"
        :model-value="filters.kind ?? ''"
        :options="kindOptions"
        allow-empty
        :placeholder="t('invoices.filters.allKinds')"
        @update:model-value="onKindChange"
      />
    </div>

    <div class="md:col-span-2">
      <BaseSelect
        :label="t('invoices.filters.client')"
        :model-value="filters.clientId ? String(filters.clientId) : ''"
        :options="clientSelectOptions"
        allow-empty
        :placeholder="t('invoices.filters.allClients')"
        @update:model-value="onClientChange"
      />
    </div>

    <div class="md:col-span-2">
      <BaseInput
        :model-value="filters.issuedFrom ?? ''"
        :label="t('invoices.filters.issuedFrom')"
        type="date"
        @update:model-value="onIssuedFromChange"
      />
    </div>

    <div class="md:col-span-2">
      <BaseInput
        :model-value="filters.issuedTo ?? ''"
        :label="t('invoices.filters.issuedTo')"
        type="date"
        @update:model-value="onIssuedToChange"
      />
    </div>
  </div>
</template>
