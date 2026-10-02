<script setup lang="ts">
import { computed, watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import PurchaseOrderLinesEditor from '~/components/inventory/PurchaseOrderLinesEditor.vue'
import { useT } from '~/composables/use_t'
import type {
  PurchaseOrderLineDraft,
  PurchaseOrderRow,
  PurchaseOrdersPageProps,
} from '#shared/types/inventory'

/**
 * Bon de commande en brouillon (#892). Le bateau d'affectation est facultatif :
 * renseigné, la réception inscrit le montant au budget de ce bateau.
 */
const props = defineProps<{
  open: boolean
  order?: PurchaseOrderRow | null
  suppliers: PurchaseOrdersPageProps['suppliers']
  items: PurchaseOrdersPageProps['items']
  boats: PurchaseOrdersPageProps['boats']
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const { t } = useT()

const form = useForm({
  supplierId: '' as number | '',
  boatId: '' as number | '',
  notes: '',
  lines: [] as PurchaseOrderLineDraft[],
})

const supplierOptions = computed(() => props.suppliers.map((s) => ({ value: s.id, label: s.name })))
/** Erreurs VineJS des lignes, indexées `lines.<i>.<champ>`. */
const lineErrors = computed(() => form.errors as Record<string, string | undefined>)
const boatOptions = computed(() => props.boats.map((b) => ({ value: b.id, label: b.name })))

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    form.clearErrors()
    const order = props.order
    form.supplierId = order?.supplierId ?? ''
    form.boatId = order?.boatId ?? ''
    form.notes = order?.notes ?? ''
    form.lines = order
      ? order.lines.map((line) => ({
          inventoryItemId: line.inventoryItemId,
          quantity: String(line.quantity),
          unitCost: String(line.unitCost),
        }))
      : [{ inventoryItemId: '', quantity: '1', unitCost: '' }]
  }
)

form.transform((data) => ({
  supplierId: data.supplierId === '' ? null : data.supplierId,
  boatId: data.boatId === '' ? null : data.boatId,
  notes: data.notes.trim() || null,
  lines: data.lines.map((line) => ({
    inventoryItemId: line.inventoryItemId === '' ? null : line.inventoryItemId,
    quantity: Number(line.quantity),
    unitCost: line.unitCost === '' ? null : Number(line.unitCost),
  })),
}))

function submit() {
  const options = { preserveScroll: true, onSuccess: () => emit('update:open', false) }
  if (props.order) form.put(`/inventory/orders/${props.order.id}`, options)
  else form.post('/inventory/orders', options)
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="
      order
        ? t('inventory.orders.form.editTitle', { number: String(order.number) })
        : t('inventory.orders.form.addTitle')
    "
    size="xl"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-4" data-testid="purchase-order-form" @submit.prevent="submit">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BaseSelect
          v-model="form.supplierId"
          :label="t('inventory.fields.supplier')"
          :options="supplierOptions"
          :error="form.errors.supplierId"
          required
        />
        <BaseSelect
          v-model="form.boatId"
          :label="t('inventory.orders.form.boat')"
          :hint="t('inventory.orders.form.boatHint')"
          :options="boatOptions"
          :placeholder="t('inventory.orders.form.workshop')"
          allow-empty
        />
      </div>
      <PurchaseOrderLinesEditor v-model="form.lines" :items="items" :errors="lineErrors" />
      <BaseTextarea v-model="form.notes" :label="t('inventory.fields.notes')" :rows="2" />
      <div class="flex justify-end gap-2 pt-2">
        <BaseButton variant="secondary" type="button" @click="emit('update:open', false)">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton type="submit" :disabled="form.processing">{{ t('common.save') }}</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
