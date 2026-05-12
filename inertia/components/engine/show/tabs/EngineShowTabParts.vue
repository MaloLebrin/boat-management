<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useT } from '~/composables/useT'

const { t } = useT()
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-lg font-semibold text-fg">{{ t('boats.engineShow.parts.title') }}</h2>

    <div class="border-2 border-dashed border-border rounded-lg p-8">
      <table class="w-full text-sm text-left">
        <thead class="text-fg-muted">
          <tr>
            <th class="pb-3 font-medium">{{ t('boats.engineShow.parts.designation') }}</th>
            <th class="pb-3 font-medium">{{ t('boats.engineShow.parts.reference') }}</th>
            <th class="pb-3 font-medium">{{ t('boats.engineShow.parts.stock') }}</th>
            <th class="pb-3 font-medium">{{ t('boats.engineShow.parts.supplier') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="4" class="py-8 text-center text-fg-muted">
              {{ t('boats.engineShow.parts.empty') }}
            </td>
          </tr>
        </tbody>
      </table>
      <div class="text-center mt-4">
        <BaseBadge variant="info">{{ t('boats.engineShow.parts.comingSoon') }}</BaseBadge>
      </div>
    </div>
  </div>
</template>
