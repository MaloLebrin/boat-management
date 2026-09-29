<script setup lang="ts">
import { ref } from 'vue'
import { useT } from '~/composables/use_t'

/** Photos du bateau sur sa page publique (#881) : une grande, les autres en vignettes. */
const props = defineProps<{ photos: string[]; boatName: string }>()

const { t } = useT()
const active = ref(0)
</script>

<template>
  <div v-if="photos.length" class="space-y-2" data-testid="public-boat-gallery">
    <div class="aspect-[4/3] overflow-hidden rounded-(--radius-card) bg-surface-muted">
      <img :src="photos[active]" :alt="boatName" class="h-full w-full object-cover" />
    </div>
    <div v-if="photos.length > 1" class="flex gap-2 overflow-x-auto">
      <button
        v-for="(photo, index) in props.photos"
        :key="photo"
        type="button"
        class="h-16 w-20 shrink-0 overflow-hidden rounded-md border-2"
        :class="index === active ? 'border-brand' : 'border-transparent'"
        :aria-label="t('public.booking.boat.photo', { index: String(index + 1) })"
        @click="active = index"
      >
        <img :src="photo" alt="" class="h-full w-full object-cover" loading="lazy" />
      </button>
    </div>
  </div>
  <div v-else class="aspect-[4/3] rounded-(--radius-card) bg-surface-muted" />
</template>
