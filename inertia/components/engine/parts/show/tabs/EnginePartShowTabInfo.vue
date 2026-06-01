<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/useT'
import type { BoatShowEnginePart } from '~/types/boat_show'

defineProps<{
  part: BoatShowEnginePart
}>()

const { t } = useT()

function wearStateVariant(state: string): 'success' | 'info' | 'warning' | 'neutral' | 'danger' {
  if (state === 'new') return 'success'
  if (state === 'good') return 'info'
  if (state === 'worn') return 'warning'
  if (state === 'to_replace') return 'danger'
  return 'neutral'
}
</script>

<template>
  <div class="space-y-4">
    <BaseCard>
      <p class="text-sm font-semibold text-fg mb-4">{{ t('boats.engineShow.partShow.info.title') }}</p>
      <dl class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt class="text-fg-muted">{{ t('boats.engineShow.partShow.info.designation') }}</dt>
          <dd class="font-medium text-fg">{{ part.designation }}</dd>
        </div>
        <div>
          <dt class="text-fg-muted">{{ t('boats.engineShow.partShow.info.reference') }}</dt>
          <dd class="font-medium text-fg">{{ part.reference ?? '-' }}</dd>
        </div>
        <div>
          <dt class="text-fg-muted">{{ t('boats.engineShow.partShow.info.stock') }}</dt>
          <dd class="font-medium text-fg">{{ part.stock ?? '-' }}</dd>
        </div>
        <div>
          <dt class="text-fg-muted">{{ t('boats.engineShow.partShow.info.supplier') }}</dt>
          <dd class="font-medium text-fg">{{ part.supplier ?? '-' }}</dd>
        </div>
        <div>
          <dt class="text-fg-muted">{{ t('equipment.wearState.label') }}</dt>
          <dd class="mt-1">
            <BaseBadge v-if="part.wearState" :variant="wearStateVariant(part.wearState)">
              {{ t(`equipment.wearState.${part.wearState}`) }}
            </BaseBadge>
            <span v-else class="font-medium text-fg">-</span>
          </dd>
        </div>
      </dl>
    </BaseCard>

    <BaseCard>
      <p class="text-sm font-semibold text-fg mb-3">{{ t('boats.engineShow.partShow.info.notes') }}</p>
      <p v-if="part.notes" class="whitespace-pre-wrap text-sm text-fg">{{ part.notes }}</p>
      <p v-else class="text-sm text-fg-muted">{{ t('boats.engineShow.partShow.info.noNotes') }}</p>
    </BaseCard>
  </div>
</template>
