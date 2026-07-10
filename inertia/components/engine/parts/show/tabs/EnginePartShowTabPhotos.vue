<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import MediaPhotoGallery from '~/components/media/MediaPhotoGallery.vue'
import type { BoatShowEnginePart } from '~/types/boat_show'

const props = defineProps<{
  boat: { id: number; name: string }
  engine: { id: number }
  part: BoatShowEnginePart
  canManage: boolean
}>()

const uploadUrl = `/boats/${props.boat.id}/engines/${props.engine.id}/parts/${props.part.id}/photos`

function deleteUrlFor(mediaId: number): string {
  return `${uploadUrl}/${mediaId}`
}
</script>

<template>
  <BaseCard padded>
    <MediaPhotoGallery
      :upload-url="uploadUrl"
      :delete-url-for="deleteUrlFor"
      :photos="part.photos"
      :can-upload="canManage"
      :can-delete="canManage"
    />
  </BaseCard>
</template>
