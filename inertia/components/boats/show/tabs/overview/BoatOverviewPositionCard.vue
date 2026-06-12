<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/use_t'

defineProps<{ positionLabel: string | null }>()
const { t } = useT()
</script>

<template>
  <BaseCard padded>
    <p class="text-sm font-semibold text-fg">{{ t('boats.show.overview.positionTitle') }}</p>
    <p class="mt-2 text-sm text-fg-muted">
      {{ positionLabel ?? t('boats.show.overview.positionEmpty') }}
    </p>
  </BaseCard>
</template>
