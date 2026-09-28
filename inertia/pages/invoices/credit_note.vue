<script setup lang="ts">
import { computed, ref } from 'vue'
import { Head, router, usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import InvoiceLinesEditor from '~/components/invoices/InvoiceLinesEditor.vue'
import InvoiceTotalsPreview from '~/components/invoices/InvoiceTotalsPreview.vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import { computeInvoiceTotals } from '#shared/helpers/invoice_totals'
import { creditableRemaining } from '#shared/helpers/invoice_lifecycle'
import type { InvoiceDetail, InvoiceLineInput } from '#shared/types/invoice'

/**
 * Émission d'un avoir sur une facture émise (#877). Pré-rempli avec les
 * lignes de la facture (avoir total) tant qu'aucun avoir n'a été émis ; on
 * retire ou ajuste les lignes pour un avoir partiel. Client, devise et taux
 * de TVA viennent de la facture.
 */
const props = defineProps<{ invoice: InvoiceDetail }>()

const { t } = useT()
const { formatCurrency } = useNumberFormat()
const page = usePage()

const errors = computed(() => (page.props.errors ?? {}) as Record<string, string>)

const remaining = computed(() =>
  creditableRemaining(props.invoice.total, props.invoice.creditedTotal)
)

const reason = ref('')
const lines = ref<InvoiceLineInput[]>(
  props.invoice.creditedTotal > 0
    ? [{ label: '', quantity: 1, unitPrice: 0 }]
    : props.invoice.lines.map((line) => ({
        label: line.label,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      }))
)
const processing = ref(false)

const totals = computed(() => computeInvoiceTotals(lines.value, props.invoice.taxRate))
const exceeds = computed(() => totals.value.total > remaining.value)
const empty = computed(() => totals.value.total <= 0)

function money(amount: number): string {
  return formatCurrency(amount, { currency: props.invoice.currency })
}

function submit() {
  router.post(
    `/invoices/${props.invoice.id}/credit-notes`,
    { reason: reason.value, lines: lines.value },
    {
      preserveScroll: true,
      onStart: () => {
        processing.value = true
      },
      onFinish: () => {
        processing.value = false
      },
    }
  )
}
</script>

<template>
  <Head :title="t('invoices.creditNote.form.title')" />

  <div class="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8">
    <nav class="mb-6 flex items-center gap-1.5 text-sm text-fg-muted">
      <Link href="/invoices" class="transition-colors hover:text-fg">
        {{ t('invoices.title') }}
      </Link>
      <span class="select-none">></span>
      <Link :href="`/invoices/${invoice.id}`" class="transition-colors hover:text-fg">
        {{ invoice.number }}
      </Link>
      <span class="select-none">></span>
      <span class="font-medium text-fg">{{ t('invoices.creditNote.form.title') }}</span>
    </nav>

    <BaseHeading level="1">{{ t('invoices.creditNote.form.title') }}</BaseHeading>
    <p class="mt-1 text-fg-muted">
      {{
        t('invoices.creditNote.form.subtitle', {
          number: invoice.number,
          total: money(invoice.total),
        })
      }}
    </p>

    <form class="mt-6 space-y-6" @submit.prevent="submit">
      <BaseCard>
        <p class="mb-4 text-sm text-fg-muted">{{ t('invoices.creditNote.form.intro') }}</p>
        <BaseTextarea
          id="credit-note-reason"
          v-model="reason"
          name="reason"
          :rows="3"
          :maxlength="1000"
          :label="t('invoices.creditNote.form.reason')"
          :placeholder="t('invoices.creditNote.form.reasonPlaceholder')"
          :error="errors.reason"
        />
      </BaseCard>

      <BaseCard>
        <InvoiceLinesEditor
          v-model="lines"
          :tax-rate="invoice.taxRate"
          :currency="invoice.currency"
        />
        <InvoiceTotalsPreview
          class="mt-6"
          :subtotal="totals.subtotal"
          :tax-amount="totals.taxAmount"
          :total="totals.total"
          :tax-rate="String(invoice.taxRate)"
          :currency="invoice.currency"
        />
        <div class="mt-4 space-y-1 text-right text-sm text-fg-muted">
          <p v-if="invoice.creditedTotal > 0">
            {{
              t('invoices.creditNote.form.alreadyCredited', {
                amount: money(invoice.creditedTotal),
              })
            }}
          </p>
          <p data-testid="credit-note-remaining">
            {{ t('invoices.creditNote.form.remaining', { amount: money(remaining) }) }}
          </p>
        </div>
      </BaseCard>

      <BaseAlert v-if="exceeds" variant="danger" data-testid="credit-note-exceeds">
        {{ t('invoices.creditNote.form.exceeds') }}
      </BaseAlert>
      <BaseAlert v-else-if="empty" variant="warning">
        {{ t('invoices.creditNote.form.empty') }}
      </BaseAlert>

      <div class="flex justify-end gap-2">
        <Link :href="`/invoices/${invoice.id}`">
          <BaseButton type="button" variant="ghost" size="sm">
            {{ t('invoices.form.cancel') }}
          </BaseButton>
        </Link>
        <BaseButton
          type="submit"
          variant="primary"
          size="sm"
          :disabled="processing || exceeds || empty || !reason.trim()"
        >
          {{ t('invoices.creditNote.form.submit') }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>
