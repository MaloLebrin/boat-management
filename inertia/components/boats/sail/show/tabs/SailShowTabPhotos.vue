<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import MediaPhotoGallery from '~/components/media/MediaPhotoGallery.vue'
import type { BoatSailDetail } from '~/types/boat_show'

const props = defineProps<{
  boat: { id: number; name: string }
  sail: BoatSailDetail
  canManage: boolean
}>()

const uploadUrl = `/boats/${props.boat.id}/sails/${props.sail.id}/photos`

function deleteUrlFor(mediaId: number): string {
  return `${uploadUrl}/${mediaId}`
}
</script>

<template>
  <BaseCard padded>
    <MediaPhotoGallery
      :upload-url="uploadUrl"
      :delete-url-for="deleteUrlFor"
      :photos="sail.photos"
      :can-upload="canManage"
      :can-delete="canManage"
    />
  </BaseCard>
</template>
