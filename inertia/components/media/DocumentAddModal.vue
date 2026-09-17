<script setup lang="ts">
import { DocumentArrowUpIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useForm } from '@inertiajs/vue3'
import { ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import { useT } from '~/composables/use_t'
import { useByteFormat } from '~/composables/use_byte_format'
import type { DocumentModalLabels } from '~/types/documents'

/**
 * Modale d'ajout de documents (PDF, tableurs, Word) — générique (vague 3.1).
 * Le domaine appelant fournit l'URL d'envoi et ses libellés déjà traduits :
 * chaque écran garde son vocabulaire (« Légende » ici, « Libellé » là) sans
 * porter sa copie du glisser-déposer.
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    uploadUrl: string
    title: string
    subtitle: string
    labels: DocumentModalLabels
    /** Libellé du bouton de fermeture de la modale (`common.close` par défaut). */
    closeLabel?: string
    /** Conserver la position de défilement après l'envoi. */
    preserveScroll?: boolean
  }>(),
  { closeLabel: undefined, preserveScroll: false }
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const { t } = useT()
const { formatFileSize } = useByteFormat()
const fileInput = ref<HTMLInputElement>()
const isDragging = ref(false)

const form = useForm({ files: [] as File[], caption: '' })

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
  form.post(props.uploadUrl, {
    forceFormData: true,
    ...(props.preserveScroll ? { preserveScroll: true } : {}),
    onSuccess: () => close(),
  })
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="title"
    :subtitle="subtitle"
    :close-label="closeLabel ?? t('common.close')"
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
        <p class="mt-3 font-semibold text-fg">{{ labels.dropzone }}</p>
        <p class="mt-1 text-sm text-fg-muted">{{ labels.formats }}</p>
        <BaseButton
          variant="secondary"
          size="sm"
          class="mt-4"
          type="button"
          @click.stop="fileInput?.click()"
        >
          {{ labels.browse }}
        </BaseButton>
      </div>

      <div
        v-if="form.files.length > 0"
        class="rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm"
      >
        <p class="font-semibold text-fg">{{ labels.selectedFiles }}</p>
        <ul class="mt-1 space-y-1">
          <li
            v-for="(file, index) in form.files"
            :key="`${file.name}-${index}`"
            class="flex items-center justify-between gap-2 text-fg-muted"
          >
            <span class="truncate">{{ file.name }} · {{ formatFileSize(file.size) }}</span>
            <BaseButton
              type="button"
              variant="ghost"
              size="icon"
              class="text-fg-subtle hover:text-danger"
              @click="removeFile(index)"
            >
              <XMarkIcon class="h-4 w-4" />
            </BaseButton>
          </li>
        </ul>
      </div>
      <p v-if="form.errors.files" class="text-sm text-danger">{{ form.errors.files }}</p>

      <div>
        <label class="mb-1 block text-sm font-semibold text-fg">
          {{ labels.caption }}
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
          {{ form.processing ? labels.uploading : labels.upload }}
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>
