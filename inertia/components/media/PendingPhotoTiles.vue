<script setup lang="ts">
import { ClockIcon } from '@heroicons/vue/24/outline'
import BaseBadge from '~/components/base/BaseBadge.vue'
import { usePendingPhotos } from '~/composables/use_offline_photos'
import { useT } from '~/composables/use_t'

/**
 * Photos prises hors-ligne et pas encore synchronisées (#969), lues dans la
 * file IndexedDB pour l'URL d'envoi de la galerie. Elles s'effacent d'elles-mêmes
 * quand le rejeu les retire de la file — la galerie les reçoit alors du serveur.
 */
const props = defineProps<{ uploadUrl: string }>()

const { t } = useT()
const { pendingPhotos } = usePendingPhotos(() => props.uploadUrl)
</script>

<template>
  <div v-if="pendingPhotos.length > 0" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
    <div
      v-for="photo in pendingPhotos"
      :key="photo.key"
      data-testid="pending-photo"
      class="relative aspect-square overflow-hidden rounded-lg border border-dashed border-border bg-surface-muted"
    >
      <img
        :src="photo.src"
        :alt="t('common.offline.photos.pendingAlt', { name: photo.name })"
        class="h-full w-full object-cover opacity-70"
      />
      <BaseBadge variant="warning" class="absolute left-2 top-2 gap-1">
        <ClockIcon class="h-3.5 w-3.5" aria-hidden="true" />
        {{ t('common.offline.photos.pending') }}
      </BaseBadge>
    </div>
  </div>
</template>
