<script setup lang="ts">
import { Link, router } from '@inertiajs/vue3'
import { PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/useT'
import type { MouillageRow } from '~/types/port'

const props = defineProps<{
  mouillage: MouillageRow
  portId: number
}>()

const emit = defineEmits<{
  edit: [mouillage: MouillageRow]
  'manage-spots': [mouillage: MouillageRow]
}>()

const { t } = useT()

function hasBoats(): boolean {
  return props.mouillage.spots.some((s) => s.boat !== null)
}

function handleDelete() {
  if (hasBoats()) {
    alert(t('ports.mouillages.hasBoats'))
    return
  }
  if (confirm(t('ports.mouillages.deleteConfirm'))) {
    router.delete(`/ports/${props.portId}/mouillages/${props.mouillage.id}`)
  }
}
</script>

<template>
  <BaseCard padded>
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <h4 class="font-semibold text-fg">{{ mouillage.name }}</h4>
        <p v-if="mouillage.description" class="mt-1 text-sm text-fg-muted">
          {{ mouillage.description }}
        </p>
      </div>
      <div class="flex items-center gap-1">
        <BaseButton variant="ghost" size="sm" @click="emit('edit', mouillage)">
          <PencilIcon class="h-4 w-4" />
          <span class="sr-only">{{ t('ports.mouillages.edit') }}</span>
        </BaseButton>
        <BaseButton variant="ghost" size="sm" @click="handleDelete">
          <TrashIcon class="h-4 w-4 text-danger" />
          <span class="sr-only">{{ t('ports.mouillages.delete') }}</span>
        </BaseButton>
      </div>
    </div>

    <!-- Spots list -->
    <div class="mt-4">
      <div class="flex items-center justify-between">
        <p class="text-xs font-semibold uppercase text-fg-muted">{{ t('ports.spots.title') }}</p>
        <BaseButton variant="ghost" size="sm" @click="emit('manage-spots', mouillage)">
          {{ t('ports.spots.manage') }}
        </BaseButton>
      </div>
      <div v-if="mouillage.spots.length === 0" class="mt-2 text-sm text-fg-subtle">
        {{ t('ports.spots.empty') }}
      </div>
      <ul v-else class="mt-2 space-y-2">
        <li v-for="spot in mouillage.spots" :key="spot.id" class="flex items-center justify-between">
          <span class="text-sm font-medium text-fg">{{ spot.name }}</span>
          <template v-if="spot.boat">
            <Link :href="`/boats/${spot.boat.id}`" class="text-sm text-brand hover:underline">
              {{ spot.boat.name }}
            </Link>
          </template>
          <span v-else class="text-xs text-fg-muted">{{ t('ports.spots.free') }}</span>
        </li>
      </ul>
    </div>
  </BaseCard>
</template>
