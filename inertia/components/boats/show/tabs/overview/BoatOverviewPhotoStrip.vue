<script setup lang="ts">
import { PlusIcon } from '@heroicons/vue/24/outline'
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowDetail } from '~/types/boat_show'
import { sortedBoatPhotos } from '~/utils/boat_photos'

const STRIP_SIZE = 4

const props = defineProps<{ boat: BoatShowDetail; canManage: boolean }>()
const emit = defineEmits<{ 'go-to-tab': [tab: string] }>()
const { t } = useT()

const photos = computed(() => sortedBoatPhotos(props.boat.media))
const stripPhotos = computed(() => photos.value.slice(0, STRIP_SIZE))
</script>

<!-- Aperçu compact : une seule rangée de vignettes, la galerie complète vit
     dans l'onglet Photos (#811) -->
<template>
  <div v-if="photos.length > 0 || canManage" data-testid="boat-overview-photo-strip">
    <div class="mb-3 flex items-center justify-between">
      <p class="text-sm font-semibold text-fg">{{ t('boats.show.mediaUpload.photos') }}</p>
      <BaseButton
        v-if="photos.length > 0"
        variant="ghost"
        size="sm"
        @click="emit('go-to-tab', 'photos')"
      >
        {{ t('boats.show.overview.viewAllPhotos', { count: String(photos.length) }) }}
      </BaseButton>
    </div>

    <div v-if="photos.length > 0" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <button
        v-for="photo in stripPhotos"
        :key="photo.id"
        type="button"
        class="aspect-square overflow-hidden rounded-lg border border-border bg-surface-muted transition-opacity hover:opacity-90"
        @click="emit('go-to-tab', 'photos')"
      >
        <img
          :src="photo.secureUrl"
          :alt="photo.caption ?? photo.originalFilename"
          class="h-full w-full object-cover"
          loading="lazy"
        />
      </button>
    </div>

    <button
      v-else
      type="button"
      class="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-surface-muted/30 py-4 text-sm text-fg-muted transition-colors hover:border-brand/50"
      @click="emit('go-to-tab', 'photos')"
    >
      <PlusIcon class="h-5 w-5 text-fg-subtle" />
      {{ t('boats.show.mediaUpload.addPhoto') }}
    </button>
  </div>
</template>
