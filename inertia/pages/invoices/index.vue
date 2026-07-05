<script setup lang="ts">
import { computed, ref } from 'vue'
import { router, usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BasePagination from '~/components/base/BasePagination.vue'
import InvoiceListToolbar from '~/components/invoices/InvoiceListToolbar.vue'
import InvoiceStatusBadge from '~/components/invoices/InvoiceStatusBadge.vue'
import { useT } from '~/composables/use_t'
import type {
  InvoiceListFilters,
  InvoiceRow,
  InvoicesPaginated,
} from '../../../shared/types/invoice'
import type { ClientOption } from '../../../shared/types/client'

const props = defineProps<{
  invoices: InvoicesPaginated
  filters: InvoiceListFilters
  clientOptions: ClientOption[]
  canDelete: boolean
}>()

const { t } = useT()
const page = usePage()

const flash = computed(() => page.props.flash as { error?: string; success?: string } | undefined)

const deletingInvoice = ref<InvoiceRow | null>(null)

function handlePageChange(newPage: number) {
  router.get(
    '/invoices',
    {
      q: props.filters.q || undefined,
      status: props.filters.status || undefined,
      kind: props.filters.kind || undefined,
      clientId: props.filters.clientId || undefined,
      issuedFrom: props.filters.issuedFrom || undefined,
      issuedTo: props.filters.issuedTo || undefined,
      sort: props.filters.sort,
      direction: props.filters.direction,
      page: newPage,
      perPage: props.filters.perPage,
    },
    { preserveScroll: true, preserveState: true, replace: true }
  )
}

function confirmDelete(invoice: InvoiceRow) {
  deletingInvoice.value = invoice
}

function executeDelete() {
  if (!deletingInvoice.value) return
  router.delete(`/invoices/${deletingInvoice.value.id}`, {
    preserveScroll: true,
    onFinish: () => {
      deletingInvoice.value = null
    },
  })
}

function formatTotal(invoice: InvoiceRow): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: invoice.currency,
  }).format(invoice.total)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <BaseHeading level="1">{{ t('invoices.title') }}</BaseHeading>
        <p class="mt-1 text-sm text-fg-muted">
          {{ t('invoices.count', { count: String(invoices.meta.total) }) }}
        </p>
      </div>
      <Link href="/invoices/new">
        <BaseButton variant="primary" size="sm" type="button">
          {{ t('invoices.add') }}
        </BaseButton>
      </Link>
    </div>

    <BaseAlert v-if="flash?.success" variant="success" class="mb-6" dismissible>
      {{ flash.success }}
    </BaseAlert>
    <BaseAlert v-if="flash?.error" variant="danger" class="mb-6" dismissible>
      {{ flash.error }}
    </BaseAlert>

    <InvoiceListToolbar :filters="filters" :client-options="clientOptions" />

    <div v-if="invoices.data.length > 0" class="mt-6 space-y-3">
      <BaseCard v-for="invoice in invoices.data" :key="invoice.id">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3">
              <p class="font-semibold text-fg">{{ invoice.number }}</p>
              <InvoiceStatusBadge :status="invoice.status" />
            </div>
            <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
              <span>{{ t(`invoices.kind.${invoice.kind}`) }}</span>
              <span>{{ invoice.clientName ?? t('invoices.noClient') }}</span>
              <span>{{ formatDate(invoice.issuedAt) }}</span>
            </div>
            <p class="mt-2 text-lg font-semibold text-fg">{{ formatTotal(invoice) }}</p>
          </div>

          <div class="flex shrink-0 gap-2">
            <Link :href="`/invoices/${invoice.id}`">
              <BaseButton type="button" variant="secondary" size="sm">
                {{ t('invoices.view') }}
              </BaseButton>
            </Link>
            <Link :href="`/invoices/${invoice.id}/edit`">
              <BaseButton type="button" variant="secondary" size="sm">
                {{ t('invoices.edit') }}
              </BaseButton>
            </Link>
            <BaseButton
              v-if="canDelete"
              type="button"
              variant="ghost"
              size="sm"
              @click="confirmDelete(invoice)"
            >
              {{ t('invoices.delete') }}
            </BaseButton>
          </div>
        </div>
      </BaseCard>
    </div>

    <div v-else class="mt-8">
      <BaseEmptyState
        :title="t('invoices.empty.title')"
        :description="t('invoices.empty.description')"
        :action-label="t('invoices.add')"
        @action="router.visit('/invoices/new')"
      />
    </div>

    <div v-if="invoices.data.length > 0 && invoices.meta.lastPage > 1" class="mt-6">
      <BasePagination
        :page="invoices.meta.currentPage"
        :page-count="invoices.meta.lastPage"
        @update:page="handlePageChange"
      />
    </div>

    <BaseConfirmModal
      :open="deletingInvoice !== null"
      :title="t('invoices.deleteConfirm.title')"
      :message="t('invoices.deleteConfirm.message')"
      :confirm-label="t('invoices.delete')"
      :cancel-label="t('invoices.form.cancel')"
      @update:open="deletingInvoice = null"
      @confirm="executeDelete"
    />
  </div>
</template>
