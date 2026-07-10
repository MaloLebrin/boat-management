<script setup lang="ts">
import MediaPhotoGallery from '~/components/media/MediaPhotoGallery.vue'
import type { MediaRow } from '~/types/boat_show'

defineProps<{
  uploadUrl: string
  deleteUrlFor: (mediaId: number) => string
  photos: MediaRow[]
  canUpload: boolean
  canDelete: boolean
}>()
</script>

<template>
  <MediaPhotoGallery
    :upload-url="uploadUrl"
    :delete-url-for="deleteUrlFor"
    :photos="photos"
    :can-upload="canUpload"
    :can-delete="canDelete"
  />
</template>
