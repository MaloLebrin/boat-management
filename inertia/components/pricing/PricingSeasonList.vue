<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useT } from '~/composables/use_t'
import type { PricingSeasonRow } from '../../../shared/types/pricing_season'

defineProps<{
  seasons: PricingSeasonRow[]
  canDelete: boolean
}>()

const emit = defineEmits<{
  edit: [season: PricingSeasonRow]
  delete: [season: PricingSeasonRow]
}>()

const { t } = useT()

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
}

function formatPricing(season: PricingSeasonRow): string {
  if (season.dailyPrice != null) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'EUR',
    }).format(season.dailyPrice)
  }
  if (season.multiplier != null) {
    return t('pricingSeasons.multiplierFormat', { value: String(season.multiplier) })
  }
  return '-'
}
</script>

<template>
  <div class="space-y-3">
    <BaseCard v-for="season in seasons" :key="season.id">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <p class="font-semibold text-fg">{{ season.name }}</p>
          <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
            <span>{{ formatDate(season.startsOn) }} - {{ formatDate(season.endsOn) }}</span>
            <span>{{ formatPricing(season) }}</span>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <BaseBadge v-if="season.boatName" variant="info">
              {{ season.boatName }}
            </BaseBadge>
            <BaseBadge v-else variant="neutral">
              {{ t('pricingSeasons.scope.global') }}
            </BaseBadge>
            <span class="text-xs text-fg-muted">
              {{ t('pricingSeasons.columns.priority') }}: {{ season.priority }}
            </span>
          </div>
        </div>

        <div class="flex shrink-0 gap-2">
          <BaseButton type="button" variant="secondary" size="sm" @click="emit('edit', season)">
            {{ t('pricingSeasons.edit') }}
          </BaseButton>
          <BaseButton
            v-if="canDelete"
            type="button"
            variant="ghost"
            size="sm"
            @click="emit('delete', season)"
          >
            {{ t('pricingSeasons.delete') }}
          </BaseButton>
        </div>
      </div>
    </BaseCard>
  </div>
</template>
