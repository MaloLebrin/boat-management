<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/use_t'

const props = defineProps<{ boatId: number }>()
const { t } = useT()
</script>

<template>
  <BaseCard padded>
    <p class="text-sm font-semibold text-fg">{{ t('boats.simulator.openButton') }}</p>
    <p class="mt-1 text-xs text-fg-muted">{{ t('boats.simulator.subtitle') }}</p>
    <button
      type="button"
      class="mt-3 w-full rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white hover:bg-coral-600"
      @click="router.visit(`/boats/${props.boatId}/simulator`)"
    >
      {{ t('boats.simulator.openButton') }}
    </button>
  </BaseCard>
</template>
