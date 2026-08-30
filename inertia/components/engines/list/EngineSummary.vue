<script setup lang="ts">
import { computed } from 'vue'
import BaseCard from '~/components/base/BaseCard.vue'
import type { EngineListSummary } from '#shared/types/engine'
import { useT } from '~/composables/use_t'

const { t } = useT()

const props = defineProps<{
  summary: EngineListSummary
}>()

/**
 * Compteurs de flotte (#598) — calculés côté serveur sur tout le périmètre, pas
 * sur la page courante : ils ne bougent pas au feuilletage.
 */
const tiles = computed(() => [
  { key: 'total', value: props.summary.total, tone: 'text-fg' },
  { key: 'operational', value: props.summary.operational, tone: 'text-success' },
  { key: 'inMaintenance', value: props.summary.inMaintenance, tone: 'text-info' },
  { key: 'outOfService', value: props.summary.outOfService, tone: 'text-warning' },
])
</script>

<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
    <BaseCard v-for="tile in tiles" :key="tile.key" padded>
      <p class="text-sm font-semibold text-fg-muted">
        {{ t(`engines.summary.${tile.key}`) }}
      </p>
      <p class="mt-2 font-display text-2xl font-bold tracking-tight" :class="tile.tone">
        {{ tile.value }}
      </p>
    </BaseCard>
  </div>
</template>
