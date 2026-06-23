<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { useT } from '~/composables/use_t'

const { t } = useT()

const props = defineProps<{
  boats: { id: number; name: string }[]
  selectedBoatId: number | null
  basePath: string
}>()

function onChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  router.get(props.basePath, val ? { boatId: val } : {}, { preserveScroll: true, replace: true })
}
</script>

<template>
  <div class="flex items-center gap-3">
    <label class="text-sm text-fg-muted shrink-0">
      {{ t('navigation.filter.filterByBoat') }}
    </label>
    <select
      :value="selectedBoatId ?? ''"
      class="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand/30 min-w-40"
      @change="onChange"
    >
      <option value="">{{ t('navigation.filter.allBoats') }}</option>
      <option v-for="boat in boats" :key="boat.id" :value="boat.id">
        {{ boat.name }}
      </option>
    </select>
  </div>
</template>
