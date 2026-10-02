<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import { purchaseOrderTotal } from '#shared/helpers/inventory'
import type { PurchaseOrderLineDraft, PurchaseOrdersPageProps } from '#shared/types/inventory'

/** Lignes d'un bon de commande (#892) : article, quantité, prix unitaire HT. */
const props = defineProps<{
  items: PurchaseOrdersPageProps['items']
  errors: Record<string, string | undefined>
}>()

const lines = defineModel<PurchaseOrderLineDraft[]>({ required: true })

const { t } = useT()
const { formatCurrency } = useNumberFormat()

const itemOptions = computed(() => props.items.map((i) => ({ value: i.id, label: i.name })))

const total = computed(() =>
  purchaseOrderTotal(
    lines.value.map((line) => ({
      quantity: Number(line.quantity) || 0,
      unitCost: Number(line.unitCost) || 0,
    }))
  )
)

/** Choisir un article propose son dernier prix moyen. */
function pickItem(line: PurchaseOrderLineDraft, value: number | '') {
  line.inventoryItemId = value
  const average = props.items.find((i) => i.id === value)?.averageCost
  if (line.unitCost === '' && average !== null && average !== undefined) {
    line.unitCost = String(average)
  }
}

function addLine() {
  lines.value.push({ inventoryItemId: '', quantity: '1', unitCost: '' })
}
</script>

<template>
  <fieldset class="space-y-3">
    <legend class="text-sm font-semibold text-fg">{{ t('inventory.orders.form.lines') }}</legend>
    <div
      v-for="(line, index) in lines"
      :key="index"
      class="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
      data-testid="purchase-order-line"
    >
      <BaseSelect
        :model-value="line.inventoryItemId"
        :label="t('inventory.orders.form.item')"
        :options="itemOptions"
        :error="errors[`lines.${index}.inventoryItemId`]"
        required
        @update:model-value="pickItem(line, $event as number | '')"
      />
      <BaseInput
        v-model="line.quantity"
        type="number"
        step="0.01"
        min="0"
        :label="t('inventory.fields.quantity')"
        :error="errors[`lines.${index}.quantity`]"
        required
      />
      <BaseInput
        v-model="line.unitCost"
        type="number"
        step="0.01"
        min="0"
        :label="t('inventory.fields.unitCost')"
        :error="errors[`lines.${index}.unitCost`]"
      />
      <BaseButton
        variant="ghost"
        size="sm"
        type="button"
        :disabled="lines.length === 1"
        @click="lines.splice(index, 1)"
      >
        {{ t('inventory.orders.form.removeLine') }}
      </BaseButton>
    </div>
    <div class="flex items-center justify-between gap-3">
      <BaseButton variant="secondary" size="sm" type="button" @click="addLine">
        {{ t('inventory.orders.form.addLine') }}
      </BaseButton>
      <p class="text-sm font-semibold text-fg" data-testid="purchase-order-total">
        {{ t('inventory.orders.total', { total: formatCurrency(total) }) }}
      </p>
    </div>
    <p v-if="errors.lines" class="text-sm text-danger">{{ errors.lines }}</p>
  </fieldset>
</template>
