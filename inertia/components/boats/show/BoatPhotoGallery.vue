<script setup lang="ts">
import { PhotoIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { Form } from '@adonisjs/inertia/vue'
import { useForm } from '@inertiajs/vue3'
import { ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowDetail, MediaRow } from '~/types/boat_show'
import { computed } from 'vue'

const props = defineProps<{
  boat: BoatShowDetail
  canManage: boolean
}>()

const { t } = useT()
const fileInput = ref<HTMLInputElement>()
const form = useForm({ file: null as File | null, caption: '' })

const photos = computed<MediaRow[]>(() =>
  props.boat.media.filter((m) => m.kind === 'photo').sort((a, b) => a.position - b.position)
)

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  form.file = input.files?.[0] ?? null
  if (form.file) submitPhoto()
}

function submitPhoto() {
  form.post(`/boats/${props.boat.id}/photos`, {
    forceFormData: true,
    onSuccess: () => {
      form.reset()
      if (fileInput.value) fileInput.value.value = ''
    },
  })
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <p class="text-sm font-semibold text-fg">{{ t('boats.show.mediaUpload.photos') }}</p>
      <BaseButton
        v-if="canManage"
        variant="secondary"
        size="sm"
        type="button"
        :disabled="form.processing"
        @click="fileInput?.click()"
      >
        <PlusIcon class="h-4 w-4 mr-1" />
        {{ t('boats.show.mediaUpload.addPhoto') }}
      </BaseButton>
    </div>

    <input
      v-if="canManage"
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif,.heic,.heif"
      class="hidden"
      @change="onFileChange"
    />

    <!-- Empty state -->
    <div
      v-if="photos.length === 0"
      class="rounded-lg border-2 border-dashed border-border bg-surface-muted/30 p-8 text-center"
      :class="{ 'cursor-pointer hover:border-brand/50 transition-colors': canManage }"
      @click="canManage ? fileInput?.click() : undefined"
    >
      <PhotoIcon class="mx-auto h-8 w-8 text-fg-subtle" />
      <p class="mt-2 text-sm text-fg-muted">{{ t('boats.show.mediaUpload.noPhotos') }}</p>
      <p v-if="canManage" class="mt-1 text-xs text-fg-subtle">
        {{ t('boats.show.mediaUpload.photoFormats') }}
      </p>
    </div>

    <!-- Photo grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
          v-if="photo.caption"
          class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 px-2 py-1"
        >
          <p class="text-xs text-white truncate">{{ photo.caption }}</p>
        </div>
        <div
          v-if="canManage"
          class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Form
            :action="{ url: `/boats/${boat.id}/media/${photo.id}`, method: 'delete' }"
            #default="{ processing }"
          >
            <button
              type="submit"
              :disabled="processing"
              class="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white hover:bg-danger/90 disabled:opacity-50"
            >
              {{ t('boats.show.mediaUpload.deletePhoto') }}
            </button>
          </Form>
        </div>
      </div>

      <!-- Upload tile -->
      <button
        v-if="canManage"
        type="button"
        :disabled="form.processing"
        class="aspect-square rounded-lg border-2 border-dashed border-border bg-surface-muted/30 flex flex-col items-center justify-center gap-1 hover:border-brand/50 transition-colors disabled:opacity-50"
        @click="fileInput?.click()"
      >
        <PlusIcon class="h-6 w-6 text-fg-subtle" />
        <span class="text-xs text-fg-muted">{{ t('boats.show.mediaUpload.addPhoto') }}</span>
      </button>
    </div>
  </div>
</template>
