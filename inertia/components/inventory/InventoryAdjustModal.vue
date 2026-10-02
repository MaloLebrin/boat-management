<script setup lang="ts">
import { watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type { InventoryItemRow } from '#shared/types/inventory'

/**
 * Inventaire tournant (#892) : on saisit ce qu'on a compté sur l'étagère, le
 * serveur écrit l'écart comme un mouvement `adjustment`.
 */
const props = defineProps<{
  open: boolean
  item: InventoryItemRow | null
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const { t } = useT()
const { formatNumber } = useNumberFormat()

const form = useForm({ countedQuantity: '', note: '' })

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen || !props.item) return
    form.reset()
    form.clearErrors()
    form.countedQuantity = String(Math.max(props.item.quantity, 0))
  }
)

form.transform((data) => ({
  countedQuantity: Number(data.countedQuantity),
  note: data.note.trim() || null,
}))

function submit() {
  if (!props.item) return
  form.post(`/inventory/${props.item.id}/adjust`, {
    preserveScroll: true,
    onSuccess: () => emit('update:open', false),
  })
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="t('inventory.adjust.title')"
    :subtitle="item?.name"
    @update:open="emit('update:open', $event)"
  >
    <form
      v-if="item"
      class="space-y-4"
      data-testid="inventory-adjust-form"
      @submit.prevent="submit"
    >
      <p class="text-sm text-fg-muted">
        {{
          t('inventory.adjust.current', {
            quantity: formatNumber(item.quantity),
            unit: t(`inventory.units.${item.unit}`),
          })
        }}
      </p>
      <BaseInput
        v-model="form.countedQuantity"
        type="number"
        step="0.01"
        min="0"
        :label="t('inventory.adjust.counted')"
        :error="form.errors.countedQuantity"
        required
      />
      <BaseInput
        v-model="form.note"
        :label="t('inventory.adjust.note')"
        :placeholder="t('inventory.adjust.notePlaceholder')"
        :error="form.errors.note"
      />
      <div class="flex justify-end gap-2 pt-2">
        <BaseButton variant="secondary" type="button" @click="emit('update:open', false)">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton type="submit" :disabled="form.processing">
          {{ t('inventory.adjust.submit') }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
