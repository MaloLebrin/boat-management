<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/useT'

const { t } = useT()
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-fg">{{ t('boats.engineShow.notes.title') }}</h2>
      <BaseButton variant="secondary" size="sm" disabled>
        {{ t('boats.engineShow.notes.add') }}
      </BaseButton>
    </div>

    <div class="border-2 border-dashed border-border rounded-lg p-8 text-center">
      <div class="space-y-4 text-fg-muted">
        <p class="font-medium">{{ t('boats.engineShow.notes.types') }}</p>
        <div class="flex flex-wrap justify-center gap-4 text-sm">
          <span class="flex items-center gap-1">
            <span>&#128204;</span> {{ t('boats.engineShow.notes.followUp') }}
          </span>
          <span class="flex items-center gap-1">
            <span>&#9888;</span> {{ t('boats.engineShow.notes.anomaly') }}
          </span>
          <span class="flex items-center gap-1">
            <span>&#128161;</span> {{ t('boats.engineShow.notes.idea') }}
          </span>
        </div>
      </div>
      <BaseBadge variant="info" class="mt-6">{{ t('boats.engineShow.notes.comingSoon') }}</BaseBadge>
    </div>
  </div>
</template>
