<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'

const { t } = useT()

const props = defineProps<{
  boats: { id: number; name: string }[]
  selectedBoatId: number | null
  basePath: string
}>()

const boatOptions = computed(() => props.boats.map((b) => ({ value: String(b.id), label: b.name })))

const currentBoatId = ref(props.selectedBoatId ? String(props.selectedBoatId) : '')

watch(currentBoatId, (val) => {
  router.get(props.basePath, val ? { boatId: val } : {}, { preserveScroll: true, replace: true })
})
</script>

<template>
  <div class="flex items-center gap-3">
    <label class="text-sm text-fg-muted shrink-0">
      {{ t('navigation.filter.filterByBoat') }}
    </label>
    <BaseSelect
      v-model="currentBoatId"
      :options="boatOptions"
      allow-empty
      :placeholder="t('navigation.filter.allBoats')"
    />
  </div>
</template>
