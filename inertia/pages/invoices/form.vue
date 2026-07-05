<script setup lang="ts">
import { computed, ref } from 'vue'
import { router, usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import InvoiceFormFields from '~/components/invoices/InvoiceFormFields.vue'
import InvoiceLinesEditor from '~/components/invoices/InvoiceLinesEditor.vue'
import InvoiceTotalsPreview from '~/components/invoices/InvoiceTotalsPreview.vue'
import { useT } from '~/composables/use_t'
import { computeInvoiceTotals } from '#shared/helpers/invoice_totals'
import type {
  InvoiceDetail,
  InvoiceKind,
  InvoiceLineInput,
  InvoiceStatus,
} from '../../../shared/types/invoice'
import type { ClientOption } from '../../../shared/types/client'

const props = defineProps<{
  invoice: InvoiceDetail | null
  clientOptions: ClientOption[]
}>()

const { t } = useT()
const page = usePage()

const isEdit = computed(() => Boolean(props.invoice))
const errors = computed(() => (page.props.errors ?? {}) as Record<string, string>)
const flash = computed(() => page.props.flash as { error?: string; success?: string } | undefined)

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

const kind = ref<InvoiceKind>(props.invoice?.kind ?? 'quote')
const clientId = ref<number | null>(props.invoice?.clientId ?? null)
const status = ref<InvoiceStatus>(props.invoice?.status ?? 'draft')
const issuedAt = ref(props.invoice?.issuedAt?.slice(0, 10) ?? todayISO())
const dueAt = ref(props.invoice?.dueAt?.slice(0, 10) ?? '')
const taxRate = ref(String(props.invoice?.taxRate ?? 20))
const currency = ref(props.invoice?.currency ?? 'EUR')
const notes = ref(props.invoice?.notes ?? '')
const lines = ref<InvoiceLineInput[]>(
  props.invoice?.lines.map((l) => ({
    label: l.label,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
  })) ?? [{ label: '', quantity: 1, unitPrice: 0 }]
)
const processing = ref(false)

const totals = computed(() => computeInvoiceTotals(lines.value, Number(taxRate.value)))

function submit() {
  const payload = {
    kind: kind.value,
    clientId: clientId.value,
    reservationId: null,
    status: status.value,
    issuedAt: issuedAt.value,
    dueAt: dueAt.value || null,
    taxRate: Number(taxRate.value),
    currency: currency.value,
    notes: notes.value || null,
    lines: lines.value,
  }
  processing.value = true
  const opts = {
    preserveScroll: true,
    onFinish: () => {
      processing.value = false
    },
  }
  if (isEdit.value) {
    router.put(`/invoices/${props.invoice!.id}`, payload, opts)
  } else {
    router.post('/invoices', payload, opts)
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8">
    <nav class="mb-6 flex items-center gap-1.5 text-sm text-fg-muted">
      <Link href="/invoices" class="transition-colors hover:text-fg">{{
        t('invoices.title')
      }}</Link>
      <span class="select-none">></span>
      <span class="font-medium text-fg">
        {{ isEdit ? t('invoices.form.editTitle') : t('invoices.form.createTitle') }}
      </span>
    </nav>

    <BaseHeading level="1">
      {{ isEdit ? t('invoices.form.editTitle') : t('invoices.form.createTitle') }}
    </BaseHeading>

    <BaseAlert v-if="flash?.error" variant="danger" class="mt-4" dismissible>
      {{ flash.error }}
    </BaseAlert>

    <form class="mt-6 space-y-6" @submit.prevent="submit">
      <BaseCard>
        <InvoiceFormFields
          :kind="kind"
          :status="status"
          :client-id="clientId"
          :issued-at="issuedAt"
          :due-at="dueAt"
          :tax-rate="taxRate"
          :currency="currency"
          :notes="notes"
          :client-options="clientOptions"
          :is-edit="isEdit"
          :errors="errors"
          @update:kind="kind = $event"
          @update:status="status = $event"
          @update:client-id="clientId = $event"
          @update:issued-at="issuedAt = $event"
          @update:due-at="dueAt = $event"
          @update:tax-rate="taxRate = $event"
          @update:currency="currency = $event"
          @update:notes="notes = $event"
        />
      </BaseCard>

      <BaseCard>
        <InvoiceLinesEditor v-model="lines" :tax-rate="Number(taxRate)" :currency="currency" />
        <InvoiceTotalsPreview
          class="mt-6"
          :subtotal="totals.subtotal"
          :tax-amount="totals.taxAmount"
          :total="totals.total"
          :tax-rate="taxRate"
          :currency="currency"
        />
      </BaseCard>

      <div class="flex justify-end gap-2">
        <Link href="/invoices">
          <BaseButton type="button" variant="ghost" size="sm">{{
            t('invoices.form.cancel')
          }}</BaseButton>
        </Link>
        <BaseButton type="submit" variant="primary" size="sm" :disabled="processing">
          {{ t('invoices.form.submit') }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>
