<script setup lang="ts">
import { DocumentArrowUpIcon } from '@heroicons/vue/24/outline'
import { useForm } from '@inertiajs/vue3'
import { ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  clientId: number
  clientName: string
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const { t } = useT()
const fileInput = ref<HTMLInputElement>()
const isDragging = ref(false)

const form = useForm({ file: null as File | null, caption: '' })

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  form.file = input.files?.[0] ?? null
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  form.file = e.dataTransfer?.files?.[0] ?? null
}

function close() {
  form.reset()
  emit('update:open', false)
}

function submit() {
  if (!form.file) return
  form.post(`/clients/${props.clientId}/documents`, {
    forceFormData: true,
    preserveScroll: true,
    onSuccess: () => close(),
  })
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="t('clients.documents.modalTitle')"
    :subtitle="t('clients.documents.modalSubtitle', { name: clientName })"
    :close-label="t('common.cancel')"
    size="xl"
    @update:open="close"
  >
    <div class="space-y-5">
      <input
        ref="fileInput"
        type="file"
        accept=".pdf,.csv,.xlsx,.docx,.doc"
        class="hidden"
        @change="onFileChange"
      />

      <!-- Drop zone -->
      <div
        :class="[
          'rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-brand bg-brand/5'
            : 'border-border bg-surface-muted/30 hover:border-brand/50',
        ]"
        @click="fileInput?.click()"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <DocumentArrowUpIcon class="mx-auto h-10 w-10 text-fg-subtle" />
        <p class="mt-3 font-semibold text-fg">{{ t('clients.documents.dropzone') }}</p>
        <p class="mt-1 text-sm text-fg-muted">{{ t('clients.documents.formats') }}</p>
        <BaseButton
          variant="secondary"
          size="sm"
          class="mt-4"
          type="button"
          @click.stop="fileInput?.click()"
        >
          {{ t('clients.documents.browse') }}
        </BaseButton>
      </div>

      <!-- Selected file -->
      <div
        v-if="form.file"
        class="rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm"
      >
        <p class="font-semibold text-fg">{{ t('clients.documents.selectedFile') }}</p>
        <p class="mt-1 text-fg-muted">{{ form.file.name }} · {{ formatBytes(form.file.size) }}</p>
      </div>
      <p v-if="form.errors.file" class="text-sm text-danger">{{ form.errors.file }}</p>

      <!-- Caption -->
      <div>
        <label class="mb-1 block text-sm font-semibold text-fg">
          {{ t('clients.documents.caption') }}
        </label>
        <input
          v-model="form.caption"
          type="text"
          maxlength="255"
          class="h-10 w-full rounded-(--radius-control) border border-border bg-surface-elevated px-3 text-sm text-fg shadow-sm placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <div class="flex items-center justify-end gap-2 pt-2">
        <BaseButton variant="ghost" type="button" @click="close">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton type="button" :disabled="!form.file || form.processing" @click="submit">
          {{ form.processing ? t('clients.documents.uploading') : t('clients.documents.upload') }}
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>
