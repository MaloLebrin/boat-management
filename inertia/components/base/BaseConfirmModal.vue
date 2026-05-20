<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import { useT } from '~/composables/useT'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
  }>(),
  { message: undefined, confirmLabel: undefined, cancelLabel: undefined }
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm'): void
}>()

const { t } = useT()

function cancel() {
  emit('update:open', false)
}

function confirm() {
  emit('confirm')
  emit('update:open', false)
}
</script>

<template>
  <BaseModal :open="open" :title="title" size="md" @update:open="emit('update:open', $event)">
    <p v-if="message" class="text-sm text-fg-muted">{{ message }}</p>
    <template #footer>
      <div class="flex justify-end gap-2">
        <BaseButton variant="secondary" size="sm" type="button" @click="cancel">
          {{ cancelLabel ?? t('common.cancel') }}
        </BaseButton>
        <BaseButton variant="danger" size="sm" type="button" @click="confirm">
          {{ confirmLabel ?? t('common.delete') }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
