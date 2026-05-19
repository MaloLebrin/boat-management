<script setup lang="ts">
import { Link, router } from '@inertiajs/vue3'
import { PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/useT'
import type { PontoonRow } from '~/types/port'

const props = defineProps<{
  pontoon: PontoonRow
  portId: number
}>()

const emit = defineEmits<{
  edit: [pontoon: PontoonRow]
}>()

const { t } = useT()

function handleDelete() {
  if (props.pontoon.boats.length > 0) {
    alert(t('ports.pontoons.hasBoats'))
    return
  }
  if (confirm(t('ports.pontoons.deleteConfirm'))) {
    router.delete(`/ports/${props.portId}/pontoons/${props.pontoon.id}`)
  }
}
</script>

<template>
  <BaseCard padded>
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <h4 class="font-semibold text-fg">{{ pontoon.name }}</h4>
        <p v-if="pontoon.description" class="mt-1 text-sm text-fg-muted">
          {{ pontoon.description }}
        </p>
      </div>
      <div class="flex items-center gap-1">
        <BaseButton variant="ghost" size="sm" @click="emit('edit', pontoon)">
          <PencilIcon class="h-4 w-4" />
          <span class="sr-only">{{ t('ports.pontoons.edit') }}</span>
        </BaseButton>
        <BaseButton variant="ghost" size="sm" @click="handleDelete">
          <TrashIcon class="h-4 w-4 text-danger" />
          <span class="sr-only">{{ t('ports.pontoons.delete') }}</span>
        </BaseButton>
      </div>
    </div>

    <!-- Boats list -->
    <div class="mt-4">
      <p class="text-xs font-semibold uppercase text-fg-muted">{{ t('ports.show.boats') }}</p>
      <div v-if="pontoon.boats.length === 0" class="mt-2 text-sm text-fg-subtle">
        {{ t('ports.show.noBoats') }}
      </div>
      <ul v-else class="mt-2 space-y-2">
        <li v-for="boat in pontoon.boats" :key="boat.id" class="flex items-center justify-between">
          <Link :href="`/boats/${boat.id}`" class="text-sm font-medium text-brand hover:underline">
            {{ boat.name }}
          </Link>
          <span class="text-xs text-fg-muted">
            {{ t('ports.show.spot') }}: {{ boat.spotIdentifier ?? t('ports.show.emptySpot') }}
          </span>
        </li>
      </ul>
    </div>
  </BaseCard>
</template>
