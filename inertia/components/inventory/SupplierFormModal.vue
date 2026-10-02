<script setup lang="ts">
import { watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'
import type { SupplierRow } from '#shared/types/inventory'

/** Fournisseur de pièces (#892) : contact et délai de livraison. */
const props = defineProps<{
  open: boolean
  supplier?: SupplierRow | null
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const { t } = useT()

const form = useForm({
  name: '',
  contactName: '',
  email: '',
  phone: '',
  leadTimeDays: '',
  notes: '',
})

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    form.reset()
    form.clearErrors()
    const supplier = props.supplier
    if (!supplier) return
    form.name = supplier.name
    form.contactName = supplier.contactName ?? ''
    form.email = supplier.email ?? ''
    form.phone = supplier.phone ?? ''
    form.leadTimeDays = supplier.leadTimeDays === null ? '' : String(supplier.leadTimeDays)
    form.notes = supplier.notes ?? ''
  }
)

form.transform((data) => ({
  name: data.name,
  contactName: data.contactName.trim() || null,
  email: data.email.trim() || null,
  phone: data.phone.trim() || null,
  leadTimeDays: data.leadTimeDays === '' ? null : Number(data.leadTimeDays),
  notes: data.notes.trim() || null,
}))

function submit() {
  const options = { preserveScroll: true, onSuccess: () => emit('update:open', false) }
  if (props.supplier) form.put(`/inventory/suppliers/${props.supplier.id}`, options)
  else form.post('/inventory/suppliers', options)
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="supplier ? t('inventory.suppliers.editTitle') : t('inventory.suppliers.addTitle')"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-4" data-testid="supplier-form" @submit.prevent="submit">
      <BaseInput
        v-model="form.name"
        :label="t('inventory.suppliers.fields.name')"
        :error="form.errors.name"
        required
      />
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BaseInput
          v-model="form.contactName"
          :label="t('inventory.suppliers.fields.contactName')"
          :error="form.errors.contactName"
        />
        <BaseInput
          v-model="form.email"
          type="email"
          :label="t('inventory.suppliers.fields.email')"
          :error="form.errors.email"
        />
        <BaseInput
          v-model="form.phone"
          type="tel"
          :label="t('inventory.suppliers.fields.phone')"
          :error="form.errors.phone"
        />
        <BaseInput
          v-model="form.leadTimeDays"
          type="number"
          step="1"
          min="0"
          :label="t('inventory.suppliers.fields.leadTimeDays')"
          :error="form.errors.leadTimeDays"
        />
      </div>
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
