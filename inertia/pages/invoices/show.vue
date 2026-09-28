<script setup lang="ts">
import { computed, ref } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import InvoiceStatusBadge from '~/components/invoices/InvoiceStatusBadge.vue'
import InvoiceLinesCard from '~/components/invoices/InvoiceLinesCard.vue'
import InvoicePaymentCard from '~/components/invoices/InvoicePaymentCard.vue'
import InvoiceOnlinePaymentCard from '~/components/invoices/InvoiceOnlinePaymentCard.vue'
import InvoiceDetailsCard from '~/components/invoices/InvoiceDetailsCard.vue'
import InvoiceCreditNotesCard from '~/components/invoices/InvoiceCreditNotesCard.vue'
import { useDeleteConfirmation } from '~/composables/use_delete_confirmation'
import { useT } from '~/composables/use_t'
import { canEditInvoice, canEditInvoicePayment } from '#shared/helpers/invoice_lifecycle'
import type { InvoiceDetail } from '../../../shared/types/invoice'

const props = defineProps<{
  invoice: InvoiceDetail
  canDelete: boolean
  readOnly?: boolean
  canAcceptOnlinePayments?: boolean
}>()

const { t } = useT()

const deletion = useDeleteConfirmation({
  url: () => `/invoices/${props.invoice.id}`,
  visit: { preserveScroll: true },
})

const sendingEmail = ref(false)
const busy = ref(false)

// A quote that has not been converted yet can be turned into an invoice.
const canConvert = computed(
  () => props.invoice.kind === 'quote' && props.invoice.convertedInvoice === null
)
// A real invoice that is neither paid, cancelled nor fully credited can be
// marked as paid.
const canMarkPaid = computed(
  () =>
    props.invoice.kind === 'invoice' &&
    props.invoice.status !== 'paid' &&
    props.invoice.status !== 'cancelled' &&
    props.invoice.status !== 'credited'
)
// Un avoir, et une facture qui en porte, ne se suppriment pas (#877).
const deletable = computed(
  () =>
    props.canDelete &&
    props.invoice.kind !== 'credit_note' &&
    props.invoice.creditNotes.length === 0
)
// Facture émise : le bloc « Avoirs » est le seul moyen de la corriger (#877).
const showCreditNotes = computed(
  () => props.invoice.kind === 'invoice' && props.invoice.status !== 'draft'
)
// Une facture émise est figée (#717) : plus de bouton « Modifier », mais un bloc
// dédié pour corriger son paiement.
const canEdit = computed(() => canEditInvoice(props.invoice))
const canEditPayment = computed(() => canEditInvoicePayment(props.invoice))

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
</script>

<template>
  <Head :title="invoice.number" />

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

    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div class="flex items-center gap-3">
          <BaseHeading level="1">{{ invoice.number }}</BaseHeading>
          <InvoiceStatusBadge :status="invoice.status" :kind="invoice.kind" />
        </div>
        <p class="mt-1 text-fg-muted">{{ t(`invoices.kind.${invoice.kind}`) }}</p>
        <!-- Facture émise : dire pourquoi le bouton « Modifier » a disparu (#717). -->
        <p v-if="!canEdit" class="mt-1 text-sm text-fg-muted">
          {{
            invoice.kind === 'credit_note'
              ? t('invoices.creditNote.lockedNotice')
              : t('invoices.lockedNotice')
          }}
        </p>
        <p v-if="invoice.creditedInvoice" class="mt-1 text-sm text-fg-muted">
          <Link :href="`/invoices/${invoice.creditedInvoice.id}`" class="underline hover:text-fg">
            {{ t('invoices.creditNote.creditFor', { number: invoice.creditedInvoice.number }) }}
          </Link>
        </p>
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
        <!-- eslint-disable vue/no-restricted-v-bind -- téléchargement PDF : une visite Inertia rendrait le binaire comme une page -->
        <a :href="`/invoices/${invoice.id}/pdf`" target="_blank" rel="noopener">
          <BaseButton variant="secondary" size="sm" type="button">
            {{ t('invoices.actions.downloadPdf') }}
          </BaseButton>
        </a>
        <!-- eslint-enable vue/no-restricted-v-bind -->
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
        <Link v-if="canEdit" :href="`/invoices/${invoice.id}/edit`">
          <BaseButton variant="secondary" size="sm" type="button">
            {{ t('invoices.edit') }}
          </BaseButton>
        </Link>
        <BaseButton
          v-if="deletable"
          variant="danger"
          size="sm"
          type="button"
          @click="deletion.ask()"
        >
          {{ t('invoices.delete') }}
        </BaseButton>
      </div>
    </div>

    <InvoiceDetailsCard :invoice="invoice" class="mt-6" />

    <!-- Paiement d'une facture émise (#717) -->
    <InvoicePaymentCard v-if="canEditPayment" :invoice="invoice" class="mt-4" />
    <InvoiceCreditNotesCard
      v-if="showCreditNotes"
      :invoice="invoice"
      :read-only="readOnly ?? false"
      class="mt-4"
    />
    <InvoiceOnlinePaymentCard
      :invoice="invoice"
      :can-accept-online-payments="canAcceptOnlinePayments ?? false"
      class="mt-4"
    />

    <!-- Lines + totals -->
    <InvoiceLinesCard :invoice="invoice" class="mt-4" />

    <!-- Notes -->
    <BaseCard v-if="invoice.notes" class="mt-4">
      <p class="mb-2 text-sm font-semibold text-fg">{{ t('invoices.show.notes') }}</p>
      <p class="whitespace-pre-wrap text-sm text-fg-muted">{{ invoice.notes }}</p>
    </BaseCard>

    <BaseConfirmModal
      :open="deletion.isOpen.value"
      :title="t('invoices.deleteConfirm.title')"
      :message="t('invoices.deleteConfirm.message')"
      :confirm-label="t('invoices.delete')"
      :cancel-label="t('invoices.form.cancel')"
      @update:open="deletion.release()"
      @confirm="deletion.confirm()"
    />
  </div>
</template>
