<script setup lang="ts">
import { PhotoIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { router, useForm } from '@inertiajs/vue3'
import { ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import type { MediaRow } from '~/types/boat_show'

const props = defineProps<{
  uploadUrl: string
  deleteUrlFor: (mediaId: number) => string
  photos: MediaRow[]
  canUpload: boolean
  canDelete: boolean
}>()

const { t } = useT()
const fileInput = ref<HTMLInputElement>()
const form = useForm({ file: null as File | null })

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  form.file = input.files?.[0] ?? null
  if (form.file) submitPhoto()
}

function submitPhoto() {
  form.post(props.uploadUrl, {
    forceFormData: true,
    preserveScroll: true,
    onSuccess: () => {
      form.reset()
      if (fileInput.value) fileInput.value.value = ''
    },
  })
}

function deletePhoto(mediaId: number) {
  if (!window.confirm(t('inspections.photos.confirmDelete'))) return
  router.delete(props.deleteUrlFor(mediaId), { preserveScroll: true })
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <p class="text-xs font-semibold uppercase tracking-wide text-fg-muted">
        {{ t('inspections.photos.title') }}
      </p>
      <BaseButton
        v-if="canUpload"
        variant="secondary"
        size="sm"
        type="button"
        :disabled="form.processing"
        @click="fileInput?.click()"
      >
        <PlusIcon class="h-4 w-4 mr-1" />
        {{ t('inspections.photos.add') }}
      </BaseButton>
    </div>

    <input
      v-if="canUpload"
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif,.heic,.heif"
      class="hidden"
      @change="onFileChange"
    />

    <p v-if="photos.length === 0" class="text-sm text-fg-muted">
      {{ t('inspections.photos.empty') }}
    </p>

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div
        v-for="photo in photos"
        :key="photo.id"
        class="group relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-muted"
      >
        <img
          :src="photo.secureUrl"
          :alt="photo.caption ?? photo.originalFilename"
          class="h-full w-full object-cover"
          loading="lazy"
        />
        <div
          v-if="canDelete"
          class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <BaseButton variant="danger" size="sm" type="button" @click="deletePhoto(photo.id)">
            {{ t('inspections.photos.delete') }}
          </BaseButton>
        </div>
      </div>
    </div>

    <div
      v-if="canUpload && photos.length === 0"
      class="mt-2 rounded-lg border-2 border-dashed border-border bg-surface-muted/30 p-6 text-center cursor-pointer hover:border-brand/50 transition-colors"
      @click="fileInput?.click()"
    >
      <PhotoIcon class="mx-auto h-6 w-6 text-fg-subtle" />
    </div>
  </div>
</template>
