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

watch(
  () => props.selectedBoatId,
  (val) => {
    currentBoatId.value = val ? String(val) : ''
  }
)

function onSelectChange(val: string | number | '') {
  currentBoatId.value = String(val)
  router.get(props.basePath, val ? { boatId: val } : {}, { preserveScroll: true, replace: true })
}
</script>

<template>
  <div class="flex items-center gap-3">
    <label for="boat-filter" class="text-sm text-fg-muted shrink-0">
      {{ t('navigation.filter.filterByBoat') }}
    </label>
    <BaseSelect
      id="boat-filter"
      :model-value="currentBoatId"
      :options="boatOptions"
      allow-empty
      :placeholder="t('navigation.filter.allBoats')"
      @update:model-value="onSelectChange"
    />
  </div>
</template>
