<script setup lang="ts">
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'
import type { InvoiceKind, InvoiceStatus } from '../../../shared/types/invoice'
import type { ClientOption } from '../../../shared/types/client'

const props = defineProps<{
  kind: InvoiceKind
  status: InvoiceStatus
  clientId: number | null
  issuedAt: string
  dueAt: string
  taxRate: string
  currency: string
  notes: string
  clientOptions: ClientOption[]
  isEdit: boolean
  errors: Record<string, string>
}>()

const emit = defineEmits<{
  'update:kind': [value: InvoiceKind]
  'update:status': [value: InvoiceStatus]
  'update:clientId': [value: number | null]
  'update:issuedAt': [value: string]
  'update:dueAt': [value: string]
  'update:taxRate': [value: string]
  'update:currency': [value: string]
  'update:notes': [value: string]
}>()

const { t } = useT()

const kindOptions: Array<{ label: string; value: InvoiceKind }> = [
  { label: t('invoices.kind.quote'), value: 'quote' },
  { label: t('invoices.kind.invoice'), value: 'invoice' },
]

const statusOptions: Array<{ label: string; value: InvoiceStatus }> = [
  { label: t('invoices.status.draft'), value: 'draft' },
  { label: t('invoices.status.sent'), value: 'sent' },
  { label: t('invoices.status.paid'), value: 'paid' },
  { label: t('invoices.status.overdue'), value: 'overdue' },
  { label: t('invoices.status.cancelled'), value: 'cancelled' },
]

const clientSelectOptions = props.clientOptions.map((c) => ({
  label: c.fullName,
  value: String(c.id),
}))

const currencyOptions = [
  { label: 'EUR', value: 'EUR' },
  { label: 'USD', value: 'USD' },
  { label: 'GBP', value: 'GBP' },
]
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <BaseSelect
      :model-value="kind"
      :label="t('invoices.fields.kind')"
      :options="kindOptions"
      name="kind"
      :disabled="isEdit"
      :errors="errors"
      error-key="kind"
      @update:model-value="emit('update:kind', $event as InvoiceKind)"
    />

    <BaseSelect
      :model-value="status"
      :label="t('invoices.fields.status')"
      :options="statusOptions"
      name="status"
      :errors="errors"
      error-key="status"
      @update:model-value="emit('update:status', $event as InvoiceStatus)"
    />

    <BaseSelect
      :model-value="clientId ? String(clientId) : ''"
      :label="t('invoices.fields.clientId')"
      :options="clientSelectOptions"
      name="clientId"
      allow-empty
      :placeholder="t('invoices.noClient')"
      :errors="errors"
      error-key="clientId"
      @update:model-value="emit('update:clientId', $event ? Number($event) : null)"
    />

    <BaseInput
      :model-value="issuedAt"
      :label="t('invoices.fields.issuedAt')"
      type="date"
      name="issuedAt"
      :errors="errors"
      error-key="issuedAt"
      @update:model-value="emit('update:issuedAt', $event)"
    />

    <BaseInput
      :model-value="dueAt"
      :label="t('invoices.fields.dueAt')"
      type="date"
      name="dueAt"
      :errors="errors"
      error-key="dueAt"
      @update:model-value="emit('update:dueAt', $event)"
    />

    <BaseInput
      :model-value="taxRate"
      :label="t('invoices.fields.taxRate')"
      type="number"
      inputmode="decimal"
      min="0"
      max="100"
      step="0.01"
      name="taxRate"
      :errors="errors"
      error-key="taxRate"
      @update:model-value="emit('update:taxRate', $event)"
    />

    <BaseSelect
      :model-value="currency"
      :label="t('invoices.fields.currency')"
      :options="currencyOptions"
      name="currency"
      :errors="errors"
      error-key="currency"
      @update:model-value="emit('update:currency', String($event))"
    />
  </div>

  <div class="mt-4">
    <BaseTextarea
      :model-value="notes"
      :label="t('invoices.fields.notes')"
      name="notes"
      :rows="3"
      :errors="errors"
      error-key="notes"
      @update:model-value="emit('update:notes', $event)"
    />
  </div>
</template>
