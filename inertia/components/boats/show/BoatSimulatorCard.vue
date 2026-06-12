<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/use_t'

const props = defineProps<{ boatId: number }>()
const { t } = useT()
</script>

<template>
  <BaseCard padded>
    <p class="text-sm font-semibold text-fg">{{ t('boats.simulator.openButton') }}</p>
    <p class="mt-1 text-xs text-fg-muted">{{ t('boats.simulator.subtitle') }}</p>
    <BaseButton route="boats.simulator" :params="{ id: props.boatId }" class="mt-3 w-full">
      {{ t('boats.simulator.openButton') }}
    </BaseButton>
  </BaseCard>
</template>
