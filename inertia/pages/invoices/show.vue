<script setup lang="ts">
import { ref } from 'vue'
import { router } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import InvoiceStatusBadge from '~/components/invoices/InvoiceStatusBadge.vue'
import { useT } from '~/composables/use_t'
import type { InvoiceDetail } from '../../../shared/types/invoice'

const props = defineProps<{
  invoice: InvoiceDetail
  canDelete: boolean
}>()

const { t } = useT()

const showDeleteModal = ref(false)

function formatAmount(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: props.invoice.currency,
  }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}

function executeDelete() {
  router.delete(`/invoices/${props.invoice.id}`, {
    preserveScroll: true,
  })
}
</script>

<template>
  <div class="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8">
    <!-- Breadcrumb -->
    <nav class="mb-6 flex items-center gap-1.5 text-sm text-fg-muted">
      <Link href="/invoices" class="transition-colors hover:text-fg">
        {{ t('invoices.title') }}
      </Link>
      <span class="select-none">></span>
      <span class="font-medium text-fg">{{ invoice.number }}</span>
    </nav>

    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div class="flex items-center gap-3">
          <BaseHeading level="1">{{ invoice.number }}</BaseHeading>
          <InvoiceStatusBadge :status="invoice.status" />
        </div>
        <p class="mt-1 text-fg-muted">{{ t(`invoices.kind.${invoice.kind}`) }}</p>
      </div>
      <div class="flex items-center gap-2">
        <Link :href="`/invoices/${invoice.id}/edit`">
          <BaseButton variant="secondary" size="sm" type="button">
            {{ t('invoices.edit') }}
          </BaseButton>
        </Link>
        <BaseButton
          v-if="canDelete"
          variant="danger"
          size="sm"
          type="button"
          @click="showDeleteModal = true"
        >
          {{ t('invoices.delete') }}
        </BaseButton>
      </div>
    </div>

    <!-- Details -->
    <BaseCard class="mt-6">
      <p class="mb-4 text-sm font-semibold text-fg">{{ t('invoices.show.details') }}</p>
      <dl class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt class="text-fg-muted">{{ t('invoices.show.issuedOn') }}</dt>
          <dd class="font-medium text-fg">{{ formatDate(invoice.issuedAt) }}</dd>
        </div>
        <div>
          <dt class="text-fg-muted">{{ t('invoices.show.dueOn') }}</dt>
          <dd class="font-medium text-fg">{{ formatDate(invoice.dueAt) }}</dd>
        </div>
        <div>
          <dt class="text-fg-muted">{{ t('invoices.show.client') }}</dt>
          <dd class="font-medium text-fg">{{ invoice.clientName ?? t('invoices.noClient') }}</dd>
        </div>
        <div>
          <dt class="text-fg-muted">{{ t('invoices.show.reservation') }}</dt>
          <dd class="font-medium text-fg">
            {{ invoice.reservationId ?? t('invoices.noReservation') }}
          </dd>
        </div>
      </dl>
    </BaseCard>

    <!-- Lines -->
    <BaseCard class="mt-4">
      <p class="mb-4 text-sm font-semibold text-fg">{{ t('invoices.lines.title') }}</p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border text-left text-fg-muted">
              <th class="pb-2 pr-4 font-medium">{{ t('invoices.lines.label') }}</th>
              <th class="pb-2 pr-4 text-right font-medium">{{ t('invoices.lines.quantity') }}</th>
              <th class="pb-2 pr-4 text-right font-medium">{{ t('invoices.lines.unitPrice') }}</th>
              <th class="pb-2 text-right font-medium">{{ t('invoices.lines.amount') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in invoice.lines" :key="line.id" class="border-b border-border">
              <td class="py-2 pr-4 text-fg">{{ line.label }}</td>
              <td class="py-2 pr-4 text-right text-fg-muted">{{ line.quantity }}</td>
              <td class="py-2 pr-4 text-right text-fg-muted">{{ formatAmount(line.unitPrice) }}</td>
              <td class="py-2 text-right font-medium text-fg">{{ formatAmount(line.amount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div class="mt-4 flex flex-col items-end border-t border-border pt-4">
        <div class="flex w-48 justify-between text-sm">
          <span class="text-fg-muted">{{ t('invoices.totals.subtotal') }}</span>
          <span class="font-medium text-fg">{{ formatAmount(invoice.subtotal) }}</span>
        </div>
        <div class="mt-1 flex w-48 justify-between text-sm">
          <span class="text-fg-muted">
            {{ t('invoices.totals.tax', { rate: String(invoice.taxRate) }) }}
          </span>
          <span class="font-medium text-fg">{{ formatAmount(invoice.taxAmount) }}</span>
        </div>
        <div class="mt-2 flex w-48 justify-between border-t border-border pt-2 text-base">
          <span class="font-semibold text-fg">{{ t('invoices.totals.total') }}</span>
          <span class="font-bold text-fg">{{ formatAmount(invoice.total) }}</span>
        </div>
      </div>
    </BaseCard>

    <!-- Notes -->
    <BaseCard v-if="invoice.notes" class="mt-4">
      <p class="mb-2 text-sm font-semibold text-fg">{{ t('invoices.show.notes') }}</p>
      <p class="whitespace-pre-wrap text-sm text-fg-muted">{{ invoice.notes }}</p>
    </BaseCard>

    <BaseConfirmModal
      :open="showDeleteModal"
      :title="t('invoices.deleteConfirm.title')"
      :message="t('invoices.deleteConfirm.message')"
      :confirm-label="t('invoices.delete')"
      :cancel-label="t('invoices.form.cancel')"
      @update:open="showDeleteModal = false"
      @confirm="executeDelete"
    />
  </div>
</template>
