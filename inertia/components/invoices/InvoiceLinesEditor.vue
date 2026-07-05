<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'
import { computeInvoiceTotals } from '#shared/helpers/invoice_totals'
import type { InvoiceLineInput } from '../../../shared/types/invoice'

const props = defineProps<{
  modelValue: InvoiceLineInput[]
  taxRate: number
  currency: string
}>()

const emit = defineEmits<{
  'update:modelValue': [lines: InvoiceLineInput[]]
}>()

const { t } = useT()

const totals = computed(() => computeInvoiceTotals(props.modelValue, props.taxRate))

function updateLine(index: number, field: keyof InvoiceLineInput, value: string | number) {
  const newLines = [...props.modelValue]
  if (field === 'label') {
    newLines[index] = { ...newLines[index], label: String(value) }
  } else if (field === 'quantity') {
    newLines[index] = { ...newLines[index], quantity: Number(value) || 0 }
  } else if (field === 'unitPrice') {
    newLines[index] = { ...newLines[index], unitPrice: Number(value) || 0 }
  }
  emit('update:modelValue', newLines)
}

function removeLine(index: number) {
  const newLines = props.modelValue.filter((_, i) => i !== index)
  emit('update:modelValue', newLines)
}

function addLine() {
  emit('update:modelValue', [...props.modelValue, { label: '', quantity: 1, unitPrice: 0 }])
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: props.currency,
  }).format(amount)
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm font-semibold text-fg">{{ t('invoices.lines.title') }}</p>

    <div class="space-y-3">
      <div
        v-for="(line, index) in modelValue"
        :key="index"
        class="grid grid-cols-12 gap-2 items-end"
      >
        <div class="col-span-5">
          <BaseInput
            :model-value="line.label"
            :label="index === 0 ? t('invoices.lines.label') : undefined"
            name="label"
            @update:model-value="updateLine(index, 'label', $event)"
          />
        </div>
        <div class="col-span-2">
          <BaseInput
            :model-value="String(line.quantity)"
            :label="index === 0 ? t('invoices.lines.quantity') : undefined"
            name="quantity"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            @update:model-value="updateLine(index, 'quantity', $event)"
          />
        </div>
        <div class="col-span-2">
          <BaseInput
            :model-value="String(line.unitPrice)"
            :label="index === 0 ? t('invoices.lines.unitPrice') : undefined"
            name="unitPrice"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            @update:model-value="updateLine(index, 'unitPrice', $event)"
          />
        </div>
        <div class="col-span-2">
          <p v-if="index === 0" class="mb-1 text-sm font-medium text-fg">
            {{ t('invoices.lines.amount') }}
          </p>
          <p class="h-10 flex items-center text-sm text-fg-muted">
            {{ formatAmount(totals.lines[index]?.amount ?? 0) }}
          </p>
        </div>
        <div class="col-span-1 flex justify-end">
          <BaseButton
            type="button"
            variant="ghost"
            size="sm"
            :aria-label="t('invoices.lines.remove')"
            @click="removeLine(index)"
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fill-rule="evenodd"
                d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                clip-rule="evenodd"
              />
            </svg>
          </BaseButton>
        </div>
      </div>
    </div>

    <BaseButton type="button" variant="secondary" size="sm" @click="addLine">
      {{ t('invoices.lines.add') }}
    </BaseButton>
  </div>
</template>
