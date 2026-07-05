<script setup lang="ts">
import { computed, ref } from 'vue'
import { router, usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import InvoiceStatusBadge from '~/components/invoices/InvoiceStatusBadge.vue'
import InvoiceLinesCard from '~/components/invoices/InvoiceLinesCard.vue'
import { useT } from '~/composables/use_t'
import type { InvoiceDetail } from '../../../shared/types/invoice'

const props = defineProps<{
  invoice: InvoiceDetail
  canDelete: boolean
}>()

const { t } = useT()
const page = usePage()

const flash = computed(() => page.props.flash as { error?: string; success?: string } | undefined)

const showDeleteModal = ref(false)
const sendingEmail = ref(false)
const busy = ref(false)

// A quote that has not been converted yet can be turned into an invoice.
const canConvert = computed(
  () => props.invoice.kind === 'quote' && props.invoice.convertedInvoice === null
)
// A real invoice that is neither paid nor cancelled can be marked as paid.
const canMarkPaid = computed(
  () =>
    props.invoice.kind === 'invoice' &&
    props.invoice.status !== 'paid' &&
    props.invoice.status !== 'cancelled'
)

function sendByEmail() {
  router.post(
    `/invoices/${props.invoice.id}/send`,
    {},
    {
      preserveScroll: true,
      onStart: () => {
        sendingEmail.value = true
      },
      onFinish: () => {
        sendingEmail.value = false
      },
    }
  )
}

function convertToInvoice() {
  router.post(
    `/invoices/${props.invoice.id}/convert`,
    {},
    {
      preserveScroll: true,
      onStart: () => {
        busy.value = true
      },
      onFinish: () => {
        busy.value = false
      },
    }
  )
}

function markPaid() {
  router.post(
    `/invoices/${props.invoice.id}/pay`,
    {},
    {
      preserveScroll: true,
      onStart: () => {
        busy.value = true
      },
      onFinish: () => {
        busy.value = false
      },
    }
  )
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

    <!-- Flash messages -->
    <BaseAlert v-if="flash?.success" variant="success" class="mb-6" dismissible>
      {{ flash.success }}
    </BaseAlert>
    <BaseAlert v-if="flash?.error" variant="danger" class="mb-6" dismissible>
      {{ flash.error }}
    </BaseAlert>

    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div class="flex items-center gap-3">
          <BaseHeading level="1">{{ invoice.number }}</BaseHeading>
          <InvoiceStatusBadge :status="invoice.status" />
        </div>
        <p class="mt-1 text-fg-muted">{{ t(`invoices.kind.${invoice.kind}`) }}</p>
        <p v-if="invoice.sourceQuote" class="mt-1 text-sm text-fg-muted">
          <Link :href="`/invoices/${invoice.sourceQuote.id}`" class="underline hover:text-fg">
            {{ t('invoices.show.convertedFrom', { number: invoice.sourceQuote.number }) }}
          </Link>
        </p>
        <p v-if="invoice.convertedInvoice" class="mt-1 text-sm text-fg-muted">
          <Link :href="`/invoices/${invoice.convertedInvoice.id}`" class="underline hover:text-fg">
            {{ t('invoices.show.convertedTo', { number: invoice.convertedInvoice.number }) }}
          </Link>
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <a :href="`/invoices/${invoice.id}/pdf`" target="_blank" rel="noopener">
          <BaseButton variant="secondary" size="sm" type="button">
            {{ t('invoices.actions.downloadPdf') }}
          </BaseButton>
        </a>
        <BaseButton
          variant="secondary"
          size="sm"
          type="button"
          :disabled="sendingEmail"
          @click="sendByEmail"
        >
          {{ t('invoices.actions.sendEmail') }}
        </BaseButton>
        <BaseButton
          v-if="canConvert"
          variant="primary"
          size="sm"
          type="button"
          :disabled="busy"
          @click="convertToInvoice"
        >
          {{ t('invoices.actions.convert') }}
        </BaseButton>
        <BaseButton
          v-if="canMarkPaid"
          variant="primary"
          size="sm"
          type="button"
          :disabled="busy"
          @click="markPaid"
        >
          {{ t('invoices.actions.markPaid') }}
        </BaseButton>
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
        <div v-if="invoice.paidAt">
          <dt class="text-fg-muted">{{ t('invoices.show.paidOn') }}</dt>
          <dd class="font-medium text-fg">{{ formatDate(invoice.paidAt) }}</dd>
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

    <!-- Lines + totals -->
    <InvoiceLinesCard :invoice="invoice" class="mt-4" />

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
