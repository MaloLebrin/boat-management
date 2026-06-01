<script setup lang="ts">
import { DocumentArrowUpIcon } from '@heroicons/vue/24/outline'
import { useForm } from '@inertiajs/vue3'
import { ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import { useT } from '~/composables/useT'

const props = defineProps<{
  boat: { id: number; name: string }
  engine: { id: number }
  part: { id: number; designation: string }
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
  form.post(
    `/boats/${props.boat.id}/engines/${props.engine.id}/parts/${props.part.id}/documents`,
    { forceFormData: true, onSuccess: () => close() }
  )
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="t('boats.show.mediaUpload.modalTitle')"
    :subtitle="part.designation"
    close-label="Annuler"
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

      <div
        :class="[
          'rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
          isDragging ? 'border-brand bg-brand/5' : 'border-border bg-surface-muted/30 hover:border-brand/50',
        ]"
        @click="fileInput?.click()"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <DocumentArrowUpIcon class="mx-auto h-10 w-10 text-fg-subtle" />
        <p class="mt-3 font-semibold text-fg">{{ t('boats.show.mediaUpload.dropzone') }}</p>
        <p class="mt-1 text-sm text-fg-muted">{{ t('boats.show.mediaUpload.documentFormats') }}</p>
        <BaseButton variant="secondary" size="sm" class="mt-4" type="button" @click.stop="fileInput?.click()">
          {{ t('boats.show.mediaUpload.browse') }}
        </BaseButton>
      </div>

      <div v-if="form.file" class="rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm">
        <p class="font-semibold text-fg">{{ t('boats.show.mediaUpload.selectedFile') }}</p>
        <p class="mt-1 text-fg-muted">{{ form.file.name }} · {{ formatBytes(form.file.size) }}</p>
      </div>
      <p v-if="form.errors.file" class="text-sm text-danger">{{ form.errors.file }}</p>

      <div>
        <label class="block text-sm font-semibold text-fg mb-1">
          {{ t('boats.show.mediaUpload.caption') }}
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
          {{ form.processing ? t('boats.show.mediaUpload.uploading') : t('boats.show.mediaUpload.upload') }}
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>
