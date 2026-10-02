<script setup lang="ts">
import { computed, watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'
import { INVENTORY_UNITS } from '#shared/constants/inventory'
import type { InventoryItemRow, InventoryUnit, SupplierRow } from '#shared/types/inventory'

/** Création ou modification d'un article du stock central (#892). */
const props = defineProps<{
  open: boolean
  item?: InventoryItemRow | null
  suppliers: SupplierRow[]
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const { t } = useT()

const form = useForm({
  name: '',
  reference: '',
  unit: 'unit' as InventoryUnit,
  minQuantity: '',
  location: '',
  supplierId: '' as number | '',
  notes: '',
  initialQuantity: '',
  initialUnitCost: '',
})

const isEditing = computed(() => Boolean(props.item))
const unitOptions = INVENTORY_UNITS.map((value) => ({
  value,
  label: t(`inventory.units.${value}`),
}))
const supplierOptions = computed(() => props.suppliers.map((s) => ({ value: s.id, label: s.name })))

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    form.reset()
    form.clearErrors()
    const item = props.item
    if (!item) return
    form.name = item.name
    form.reference = item.reference ?? ''
    form.unit = item.unit
    form.minQuantity = item.minQuantity === null ? '' : String(item.minQuantity)
    form.location = item.location ?? ''
    form.supplierId = item.supplierId ?? ''
    form.notes = item.notes ?? ''
  }
)

const numberOrNull = (value: string) => (value === '' ? null : Number(value))

form.transform((data) => ({
  name: data.name,
  reference: data.reference.trim() || null,
  unit: data.unit,
  minQuantity: numberOrNull(data.minQuantity),
  location: data.location.trim() || null,
  supplierId: data.supplierId === '' ? null : data.supplierId,
  notes: data.notes.trim() || null,
  ...(isEditing.value
    ? {}
    : {
        initialQuantity: numberOrNull(data.initialQuantity),
        initialUnitCost: numberOrNull(data.initialUnitCost),
      }),
}))

function submit() {
  const options = { preserveScroll: true, onSuccess: () => emit('update:open', false) }
  if (props.item) form.put(`/inventory/${props.item.id}`, options)
  else form.post('/inventory', options)
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="isEditing ? t('inventory.form.editTitle') : t('inventory.form.addTitle')"
    size="lg"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-4" data-testid="inventory-item-form" @submit.prevent="submit">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BaseInput
          v-model="form.name"
          :label="t('inventory.fields.name')"
          :error="form.errors.name"
          required
        />
        <BaseInput
          v-model="form.reference"
          :label="t('inventory.fields.reference')"
          :error="form.errors.reference"
        />
        <BaseSelect
          v-model="form.unit"
          :label="t('inventory.fields.unit')"
          :options="unitOptions"
          :error="form.errors.unit"
        />
        <BaseInput
          v-model="form.minQuantity"
          type="number"
          step="0.01"
          min="0"
          :label="t('inventory.fields.minQuantity')"
          :hint="t('inventory.form.minQuantityHint')"
          :error="form.errors.minQuantity"
        />
        <BaseInput
          v-model="form.location"
          :label="t('inventory.fields.location')"
          :error="form.errors.location"
        />
        <BaseSelect
          v-model="form.supplierId"
          :label="t('inventory.fields.supplier')"
          :options="supplierOptions"
          :placeholder="t('inventory.form.noSupplier')"
          allow-empty
        />
      </div>

      <fieldset v-if="!isEditing" class="space-y-2">
        <legend class="text-sm font-semibold text-fg">
          {{ t('inventory.form.initialStock') }}
        </legend>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <BaseInput
            v-model="form.initialQuantity"
            type="number"
            step="0.01"
            min="0"
            :label="t('inventory.fields.quantity')"
            :error="form.errors.initialQuantity"
          />
          <BaseInput
            v-model="form.initialUnitCost"
            type="number"
            step="0.01"
            min="0"
            :label="t('inventory.fields.unitCost')"
            :error="form.errors.initialUnitCost"
          />
        </div>
      </fieldset>

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
