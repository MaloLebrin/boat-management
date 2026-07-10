<script setup lang="ts">
import { DocumentArrowUpIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useForm } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowEngine } from '~/types/boat_show'

const props = defineProps<{
  boat: { id: number; name: string }
  engine: BoatShowEngine
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const { t } = useT()
const fileInput = ref<HTMLInputElement>()
const isDragging = ref(false)

const form = useForm({ files: [] as File[], caption: '' })

const engineTitle = computed(() => {
  if (props.engine.brand && props.engine.model) {
    return `${props.engine.brand} ${props.engine.model}`
  }
  if (props.engine.brand) return props.engine.brand
  if (props.engine.model) return props.engine.model
  return props.engine.kind
})

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  form.files = input.files ? Array.from(input.files) : []
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
  form.files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : []
}

function removeFile(index: number) {
  form.files = form.files.filter((_, i) => i !== index)
}

function close() {
  form.reset()
  emit('update:open', false)
}

function submit() {
  if (form.files.length === 0) return
  form.post(`/boats/${props.boat.id}/engines/${props.engine.id}/documents`, {
    forceFormData: true,
    onSuccess: () => close(),
  })
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="t('boats.show.mediaUpload.modalTitle')"
    :subtitle="t('boats.engineShow.documents.modalSubtitle', { name: engineTitle })"
    close-label="Annuler"
    size="xl"
    @update:open="close"
  >
    <div class="space-y-5">
      <input
        ref="fileInput"
        type="file"
        multiple
        accept=".pdf,.csv,.xlsx,.docx,.doc"
        class="hidden"
        @change="onFileChange"
      />

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
        <p class="mt-3 font-semibold text-fg">{{ t('boats.show.mediaUpload.dropzone') }}</p>
        <p class="mt-1 text-sm text-fg-muted">{{ t('boats.show.mediaUpload.documentFormats') }}</p>
        <BaseButton
          variant="secondary"
          size="sm"
          class="mt-4"
          type="button"
          @click.stop="fileInput?.click()"
        >
          {{ t('boats.show.mediaUpload.browse') }}
        </BaseButton>
      </div>

      <div
        v-if="form.files.length > 0"
        class="rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm"
      >
        <p class="font-semibold text-fg">{{ t('boats.show.mediaUpload.selectedFiles') }}</p>
        <ul class="mt-1 space-y-1">
          <li
            v-for="(file, index) in form.files"
            :key="`${file.name}-${index}`"
            class="flex items-center justify-between gap-2 text-fg-muted"
          >
            <span class="truncate">{{ file.name }} · {{ formatBytes(file.size) }}</span>
            <button
              type="button"
              class="text-fg-subtle hover:text-danger"
              @click="removeFile(index)"
            >
              <XMarkIcon class="h-4 w-4" />
            </button>
          </li>
        </ul>
      </div>
      <p v-if="form.errors.files" class="text-sm text-danger">{{ form.errors.files }}</p>

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
        <BaseButton type="button" :disabled="!form.files.length || form.processing" @click="submit">
          {{
            form.processing
              ? t('boats.show.mediaUpload.uploading')
              : t('boats.show.mediaUpload.upload')
          }}
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>
