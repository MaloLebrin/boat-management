<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useT } from '~/composables/useT'

const { t } = useT()
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-4">
      <h3 class="text-sm font-semibold text-fg">{{ t('boats.engineShow.documents.manual') }}</h3>
      <div class="border-2 border-dashed border-border rounded-lg p-6 text-center text-sm text-fg-muted">
        {{ t('boats.engineShow.documents.dropzone') }}
      </div>
    </div>

    <div class="space-y-4">
      <h3 class="text-sm font-semibold text-fg">{{ t('boats.engineShow.documents.invoices') }}</h3>
      <div class="border-2 border-dashed border-border rounded-lg p-6 text-center text-sm text-fg-muted">
        {{ t('boats.engineShow.documents.dropzone') }}
      </div>
    </div>

    <div class="space-y-4">
      <h3 class="text-sm font-semibold text-fg">{{ t('boats.engineShow.documents.other') }}</h3>
      <div class="border-2 border-dashed border-border rounded-lg p-6 text-center text-sm text-fg-muted">
        {{ t('boats.engineShow.documents.dropzone') }}
      </div>
    </div>

    <div class="text-center">
      <BaseBadge variant="info">{{ t('boats.engineShow.documents.comingSoon') }}</BaseBadge>
    </div>
  </div>
</template>
