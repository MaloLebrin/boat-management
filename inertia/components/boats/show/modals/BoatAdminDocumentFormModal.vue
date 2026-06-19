<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { computed, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'
import type { BoatDocumentRow, BoatShowDetail } from '~/types/boat_show'
import { BOAT_DOCUMENT_TYPES } from '../../../../../shared/types/boat_document'

const props = defineProps<{
  open: boolean
  boat: BoatShowDetail
  document?: BoatDocumentRow
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const { t } = useT()

const isEdit = computed(() => !!props.document)

const form = useForm({
  type: props.document?.type ?? 'francisation',
  customTypeLabel: props.document?.customTypeLabel ?? '',
  referenceNumber: props.document?.referenceNumber ?? '',
  issuedAt: props.document?.issuedAt ?? '',
  expiresAt: props.document?.expiresAt ?? '',
  issuer: props.document?.issuer ?? '',
  notes: props.document?.notes ?? '',
})

watch(
  () => props.document,
  (doc) => {
    form.type = doc?.type ?? 'francisation'
    form.customTypeLabel = doc?.customTypeLabel ?? ''
    form.referenceNumber = doc?.referenceNumber ?? ''
    form.issuedAt = doc?.issuedAt ?? ''
    form.expiresAt = doc?.expiresAt ?? ''
    form.issuer = doc?.issuer ?? ''
    form.notes = doc?.notes ?? ''
  }
)

const typeOptions = BOAT_DOCUMENT_TYPES.map((v) => ({
  value: v,
  label: t(`boats.adminDocs.types.${v}`),
}))

function close() {
  form.reset()
  emit('update:open', false)
}

function submit() {
  if (isEdit.value && props.document) {
    form.put(`/boats/${props.boat.id}/admin-documents/${props.document.id}`, {
      onSuccess: () => close(),
    })
  } else {
    form.post(`/boats/${props.boat.id}/admin-documents`, {
      onSuccess: () => close(),
    })
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="isEdit ? t('boats.adminDocs.editDocument') : t('boats.adminDocs.addDocument')"
    size="lg"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <BaseSelect
        v-model="form.type"
        :label="t('boats.adminDocs.form.type')"
        name="type"
        :options="typeOptions"
        :errors="form.errors"
      />

      <BaseInput
        v-if="form.type === 'other'"
        v-model="form.customTypeLabel"
        :label="t('boats.adminDocs.form.customTypeLabel')"
        name="customTypeLabel"
        :errors="form.errors"
      />

      <BaseInput
        v-model="form.referenceNumber"
        :label="t('boats.adminDocs.form.referenceNumber')"
        name="referenceNumber"
        :errors="form.errors"
      />

      <div class="grid grid-cols-2 gap-4">
        <BaseInput
          v-model="form.issuedAt"
          :label="t('boats.adminDocs.form.issuedAt')"
          name="issuedAt"
          type="text"
          placeholder="YYYY-MM-DD"
          :errors="form.errors"
        />
        <BaseInput
          v-model="form.expiresAt"
          :label="t('boats.adminDocs.form.expiresAt')"
          name="expiresAt"
          type="text"
          placeholder="YYYY-MM-DD"
          :errors="form.errors"
        />
      </div>

      <BaseInput
        v-model="form.issuer"
        :label="t('boats.adminDocs.form.issuer')"
        name="issuer"
        :errors="form.errors"
      />

      <BaseTextarea
        v-model="form.notes"
        :label="t('boats.adminDocs.form.notes')"
        name="notes"
        :rows="3"
        :errors="form.errors"
      />

      <div class="flex justify-end gap-3 pt-2">
        <BaseButton variant="ghost" type="button" @click="close">
          {{ t('boats.adminDocs.form.cancel') }}
        </BaseButton>
        <BaseButton type="submit" :disabled="form.processing">
          {{ t('boats.adminDocs.form.submit') }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
