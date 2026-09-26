<script setup lang="ts">
import { PhotoIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useByteFormat } from '~/composables/use_byte_format'
import { useT } from '~/composables/use_t'
import {
  extnameOf,
  MAX_FILES_PER_BATCH,
  PHOTO_EXTNAMES,
  PHOTO_MAX_SIZE_MB,
} from '#shared/constants/media'

/**
 * Sélecteur de photos **en attente** : il ne poste rien, il remonte des `File`
 * à son formulaire parent, qui décide quand et où les envoyer.
 *
 * C'est ce qui le distingue de `usePhotoUpload` et de `MediaPhotoGallery`, qui
 * postent eux-mêmes sur une URL connue : ici les photos doivent partir *après*
 * la création de l'entité, puisque la route d'envoi a besoin de son id.
 *
 * Les bornes (extensions, taille, nombre) sont relues de `shared/constants/media`
 * — les mêmes que le validateur VineJS et le bodyparser (#764) — et appliquées
 * dès la sélection : un fichier écarté ici n'ira pas se faire refuser en 422
 * après que l'incident a été créé.
 */
const props = withDefaults(
  defineProps<{
    modelValue: File[]
    /** Hors-ligne ou envoi en cours : le parent décide, le composant ignore le réseau. */
    disabled?: boolean
    error?: string | null
    /** Bandeau libre, déjà traduit (exemption hors-ligne par exemple). */
    notice?: string | null
    maxFiles?: number
    maxSizeMb?: number
  }>(),
  {
    disabled: false,
    error: null,
    notice: null,
    maxFiles: MAX_FILES_PER_BATCH,
    maxSizeMb: PHOTO_MAX_SIZE_MB,
  }
)

const emit = defineEmits<{
  'update:modelValue': [files: File[]]
  'rejected': [message: string]
}>()

const { t } = useT()
const { formatFileSize } = useByteFormat()

const fileInput = ref<HTMLInputElement>()
const cameraInput = ref<HTMLInputElement>()
const isDragging = ref(false)

const accept = PHOTO_EXTNAMES.map((ext) => `.${ext}`).join(',')

/**
 * Aperçus : une URL d'objet par fichier, révoquée dès que la liste change et au
 * démontage — sans ça, chaque photo choisie fuit jusqu'au rechargement.
 */
const previews = ref<string[]>([])

function revokePreviews() {
  for (const url of previews.value) URL.revokeObjectURL(url)
  previews.value = []
}

watch(
  () => props.modelValue,
  (files) => {
    revokePreviews()
    // Absent de jsdom/happy-dom : le composant doit rester montable en test.
    if (typeof URL.createObjectURL !== 'function') return
    previews.value = files.map((file) => URL.createObjectURL(file))
  },
  { immediate: true, deep: true }
)

onBeforeUnmount(revokePreviews)

const isFull = computed(() => props.modelValue.length >= props.maxFiles)

/** Trie les fichiers choisis et remonte la première raison de refus au parent. */
function accepted(incoming: File[]): File[] {
  const maxBytes = props.maxSizeMb * 1024 * 1024
  const kept: File[] = []

  for (const file of incoming) {
    if (!PHOTO_EXTNAMES.includes(extnameOf(file.name) as (typeof PHOTO_EXTNAMES)[number])) {
      emit('rejected', t('media.photos.rejectedExtension', { name: file.name }))
      continue
    }
    if (file.size > maxBytes) {
      emit('rejected', t('media.photos.rejectedSize', { name: file.name }))
      continue
    }
    if (props.modelValue.length + kept.length >= props.maxFiles) {
      emit('rejected', t('media.photos.rejectedCount', { max: String(props.maxFiles) }))
      break
    }
    kept.push(file)
  }

  return kept
}

function addFiles(incoming: File[]) {
  if (props.disabled) return
  const kept = accepted(incoming)
  if (kept.length > 0) emit('update:modelValue', [...props.modelValue, ...kept])
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  addFiles(input.files ? Array.from(input.files) : [])
  // Remis à zéro : sans ça, rechoisir le même fichier n'émet plus de `change`.
  input.value = ''
}

function onDragOver(e: DragEvent) {
  if (props.disabled) return
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  addFiles(e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [])
}

function removeFile(index: number) {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, i) => i !== index)
  )
}
</script>

<template>
  <div class="space-y-3">
    <input
      ref="fileInput"
      type="file"
      multiple
      :accept="accept"
      class="hidden"
      data-testid="photo-picker-input"
      @change="onFileChange"
    />
    <!-- `capture` casse la sélection multiple sur iOS/Android : entrée séparée (#485) -->
    <input
      ref="cameraInput"
      type="file"
      :accept="accept"
      capture="environment"
      class="hidden"
      data-testid="photo-picker-camera"
      @change="onFileChange"
    />

    <div
      :class="[
        'rounded-lg border-2 border-dashed p-6 text-center transition-colors',
        disabled
          ? 'cursor-not-allowed border-border bg-surface-muted/30 opacity-60'
          : 'cursor-pointer',
        !disabled && isDragging
          ? 'border-brand bg-brand/5'
          : !disabled && 'border-border bg-surface-muted/30 hover:border-brand/50',
      ]"
      @click="!disabled && !isFull && fileInput?.click()"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <PhotoIcon class="mx-auto h-8 w-8 text-fg-subtle" />
      <p class="mt-2 font-semibold text-fg">{{ t('media.photos.dropzone') }}</p>
      <p class="mt-1 text-xs text-fg-muted">
        {{ t('media.photos.formats', { max: String(maxSizeMb) }) }}
      </p>
      <div class="mt-3 flex items-center justify-center gap-2">
        <BaseButton
          variant="secondary"
          size="sm"
          type="button"
          :disabled="disabled || isFull"
          @click.stop="fileInput?.click()"
        >
          {{ t('media.photos.browse') }}
        </BaseButton>
        <BaseButton
          variant="ghost"
          size="sm"
          type="button"
          :disabled="disabled || isFull"
          @click.stop="cameraInput?.click()"
        >
          {{ t('media.photos.takePhoto') }}
        </BaseButton>
      </div>
    </div>

    <p v-if="notice" class="text-xs text-fg-muted">{{ notice }}</p>
    <p v-if="error" class="text-xs text-danger" data-testid="photo-picker-error">{{ error }}</p>

    <ul v-if="modelValue.length > 0" class="grid grid-cols-3 gap-2 sm:grid-cols-4">
      <li
        v-for="(file, index) in modelValue"
        :key="`${file.name}-${index}`"
        class="relative overflow-hidden rounded-lg border border-border bg-surface"
      >
        <img
          v-if="previews[index]"
          :src="previews[index]"
          :alt="file.name"
          class="h-20 w-full object-cover"
        />
        <div v-else class="flex h-20 w-full items-center justify-center">
          <PhotoIcon class="h-6 w-6 text-fg-subtle" />
        </div>
        <p class="truncate px-1.5 py-1 text-[10px] text-fg-muted">
          {{ formatFileSize(file.size) }}
        </p>
        <button
          type="button"
          :disabled="disabled"
          :aria-label="t('media.photos.remove')"
          class="absolute right-1 top-1 rounded-full bg-surface/90 p-0.5 text-fg-muted hover:text-danger disabled:opacity-50"
          @click="removeFile(index)"
        >
          <XMarkIcon class="h-3.5 w-3.5" />
        </button>
      </li>
    </ul>
  </div>
</template>
