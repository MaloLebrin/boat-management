<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { computed, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/useT'
import type { BoatShowEnginePart } from '~/types/boat_show'

const props = defineProps<{
  open: boolean
  boatId: number
  engineId: number
  editingPart: BoatShowEnginePart | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const { t } = useT()

const designation = ref('')
const reference = ref('')
const stock = ref('')
const supplier = ref('')
const notes = ref('')

const isEditing = computed(() => props.editingPart !== null)

const modalTitle = computed(() =>
  isEditing.value
    ? t('boats.engineShow.parts.editModalTitle')
    : t('boats.engineShow.parts.addModalTitle')
)

const formAction = computed(() => {
  const baseUrl = `/boats/${props.boatId}/engines/${props.engineId}/parts`
  if (isEditing.value && props.editingPart) {
    return { url: `${baseUrl}/${props.editingPart.id}`, method: 'put' as const }
  }
  return { url: baseUrl, method: 'post' as const }
})

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.editingPart) {
      designation.value = props.editingPart.designation
      reference.value = props.editingPart.reference ?? ''
      stock.value = props.editingPart.stock !== null ? String(props.editingPart.stock) : ''
      supplier.value = props.editingPart.supplier ?? ''
      notes.value = props.editingPart.notes ?? ''
    } else if (isOpen) {
      designation.value = ''
      reference.value = ''
      stock.value = ''
      supplier.value = ''
      notes.value = ''
    }
  }
)

function close() {
  emit('update:open', false)
}
</script>

<template>
  <BaseModal :open="open" :title="modalTitle" size="lg" @update:open="close">
    <Form :action="formAction" class="space-y-4" @success="close" #default="{ processing, errors }">
      <BaseInput
        id="part-designation"
        name="designation"
        :label="t('boats.engineShow.parts.designation')"
        v-model="designation"
        :errors="errors"
        required
      />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput
          id="part-reference"
          name="reference"
          :label="t('boats.engineShow.parts.reference')"
          v-model="reference"
          :errors="errors"
        />

        <BaseInput
          id="part-stock"
          name="stock"
          :label="t('boats.engineShow.parts.stock')"
          type="number"
          inputmode="numeric"
          min="0"
          step="1"
          v-model="stock"
          :errors="errors"
        />
      </div>

      <BaseInput
        id="part-supplier"
        name="supplier"
        :label="t('boats.engineShow.parts.supplier')"
        v-model="supplier"
        :errors="errors"
      />

      <BaseTextarea
        id="part-notes"
        name="notes"
        :label="t('boats.engineShow.parts.notes')"
        :rows="3"
        v-model="notes"
        :errors="errors"
      />

      <div class="flex items-center justify-end gap-2 pt-2">
        <BaseButton variant="ghost" type="button" @click="close">
          {{ t('boats.engineShow.parts.cancel') }}
        </BaseButton>
        <BaseButton type="submit" :disabled="processing">
          {{ t('boats.engineShow.parts.save') }}
        </BaseButton>
      </div>
    </Form>
  </BaseModal>
</template>
