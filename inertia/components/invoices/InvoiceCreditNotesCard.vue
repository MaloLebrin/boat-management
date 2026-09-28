<script setup lang="ts">
import { computed } from 'vue'
import { Link } from '@adonisjs/inertia/vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import InvoiceStatusBadge from '~/components/invoices/InvoiceStatusBadge.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import { canIssueCreditNote } from '#shared/helpers/invoice_lifecycle'
import type { InvoiceDetail } from '#shared/types/invoice'

/**
 * Bloc « Avoirs » d'une facture émise (#877) : les avoirs déjà émis, le reste
 * à régler net des avoirs, et l'action « Émettre un avoir ». Une facture
 * émise ne se modifie pas : c'est la seule façon de la corriger.
 */
const props = defineProps<{
  invoice: InvoiceDetail
  readOnly?: boolean
}>()

const { t } = useT()
const { formatDate } = useDateFormat()
const { formatCurrency } = useNumberFormat()

const canIssue = computed(() => !props.readOnly && canIssueCreditNote(props.invoice))
const fullyCredited = computed(() => props.invoice.status === 'credited')
const showBalance = computed(
  () => props.invoice.creditNotes.length > 0 && !fullyCredited.value && !props.invoice.paidAt
)

function money(amount: number): string {
  return formatCurrency(amount, { currency: props.invoice.currency })
}
</script>

<template>
  <BaseCard>
    <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div>
        <p class="text-sm font-semibold text-fg">{{ t('invoices.creditNote.card.title') }}</p>
        <p class="mt-1 text-sm text-fg-muted">
          {{
            fullyCredited
              ? t('invoices.creditNote.card.fullyCredited')
              : t('invoices.creditNote.card.hint')
          }}
        </p>
      </div>
      <Link v-if="canIssue" :href="`/invoices/${invoice.id}/credit-note`">
        <BaseButton variant="secondary" size="sm" type="button">
          {{ t('invoices.creditNote.issue') }}
        </BaseButton>
      </Link>
    </div>

    <p v-if="invoice.creditNotes.length === 0" class="text-sm text-fg-subtle">
      {{ t('invoices.creditNote.card.empty') }}
    </p>
    <ul v-else class="divide-y divide-border text-sm">
      <li
        v-for="note in invoice.creditNotes"
        :key="note.id"
        class="flex items-center justify-between gap-3 py-2"
      >
        <Link :href="`/invoices/${note.id}`" class="font-medium text-fg underline">
          {{ note.number }}
        </Link>
        <span class="text-fg-muted">{{ formatDate(note.issuedAt) }}</span>
        <InvoiceStatusBadge :status="note.status" kind="credit_note" />
        <span class="font-medium text-fg">− {{ money(note.total) }}</span>
      </li>
    </ul>

    <dl
      v-if="invoice.creditNotes.length > 0"
      class="mt-3 flex flex-col items-end gap-1 border-t border-border pt-3 text-sm"
    >
      <div class="flex w-56 justify-between">
        <dt class="text-fg-muted">{{ t('invoices.creditNote.card.creditedTotal') }}</dt>
        <dd class="font-medium text-fg">− {{ money(invoice.creditedTotal) }}</dd>
      </div>
      <div v-if="showBalance" class="flex w-56 justify-between">
        <dt class="font-semibold text-fg">{{ t('invoices.creditNote.card.balanceDue') }}</dt>
        <dd class="font-bold text-fg">{{ money(invoice.balanceDue) }}</dd>
      </div>
    </dl>
  </BaseCard>
</template>
