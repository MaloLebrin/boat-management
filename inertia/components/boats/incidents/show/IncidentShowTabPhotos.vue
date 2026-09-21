<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import MediaPhotoGallery from '~/components/media/MediaPhotoGallery.vue'
import { useT } from '~/composables/use_t'
import type { MediaRow } from '~/types/boat_show'

/** Galerie photo d'un incident (#814) — même pipeline média que les équipements. */
const props = defineProps<{
  boatId: number
  incidentId: number
  photos: MediaRow[]
  canManage: boolean
}>()

const { t } = useT()

const uploadUrl = `/boats/${props.boatId}/incidents/${props.incidentId}/photos`

function deleteUrlFor(mediaId: number): string {
  return `${uploadUrl}/${mediaId}`
}
</script>

<template>
  <BaseCard padded>
    <p v-if="canManage" class="mb-3 text-xs text-fg-muted">{{ t('incidents.show.photosHint') }}</p>
    <MediaPhotoGallery
      :upload-url="uploadUrl"
      :delete-url-for="deleteUrlFor"
      :photos="photos"
      :can-upload="canManage"
      :can-delete="canManage"
    />
  </BaseCard>
</template>
