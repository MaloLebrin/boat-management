<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type { BoatShowEnginePart } from '~/types/boat_show'
import { wearStateVariant } from '~/utils/status_variants'

defineProps<{
  part: BoatShowEnginePart
}>()

const { t } = useT()
const { formatNumber } = useNumberFormat()
</script>

<template>
  <div class="space-y-4">
    <BaseCard>
      <p class="text-sm font-semibold text-fg mb-4">
        {{ t('boats.engineShow.partShow.info.title') }}
      </p>
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
          <dd class="font-medium text-fg">
            <!-- Reliée au stock central (#892) : la quantité de l'atelier fait foi. -->
            <Link
              v-if="part.inventoryItem"
              :href="`/inventory/${part.inventoryItem.id}`"
              class="text-brand hover:underline"
            >
              {{ formatNumber(part.inventoryItem.quantity) }}
              {{ t(`inventory.units.${part.inventoryItem.unit}`) }} ·
              {{ part.inventoryItem.name }}
            </Link>
            <template v-else>{{ part.stock ?? '-' }}</template>
          </dd>
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
      <p class="text-sm font-semibold text-fg mb-3">
        {{ t('boats.engineShow.partShow.info.notes') }}
      </p>
      <p v-if="part.notes" class="whitespace-pre-wrap text-sm text-fg">{{ part.notes }}</p>
      <p v-else class="text-sm text-fg-muted">{{ t('boats.engineShow.partShow.info.noNotes') }}</p>
    </BaseCard>
  </div>
</template>
