<script setup lang="ts">
import { computed } from 'vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/use_t'
import { computeReservationQuote } from '#shared/helpers/reservation_quote'
import type { BoatPricingRow } from '#shared/types/boat_pricing'
import type { PricingSeasonRow } from '#shared/types/pricing_season'

const props = defineProps<{
  pricing: BoatPricingRow | null
  seasons: PricingSeasonRow[]
  startsAt: string
  endsAt: string
}>()

const emit = defineEmits<{
  apply: [total: number]
}>()

const { t, locale } = useT()

const quote = computed(() =>
  computeReservationQuote(props.pricing, props.seasons, props.startsAt, props.endsAt)
)

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency: quote.value.currency || 'EUR',
  }).format(value)
}

function lineLabel(line: { seasonName: string | null; isWeekly: boolean }): string {
  if (line.seasonName) return line.seasonName
  return line.isWeekly ? t('reservations.quote.week') : t('reservations.quote.base')
}
</script>

<template>
  <BaseCard>
    <template #header>
      <h3 class="text-sm font-semibold text-fg">{{ t('reservations.quote.title') }}</h3>
    </template>

    <!-- No pricing configured -->
    <div v-if="!pricing" class="text-sm text-fg-muted">
      {{ t('reservations.quote.noPricing') }}
    </div>

    <!-- No dates selected or invalid range -->
    <div v-else-if="quote.nights <= 0" class="text-sm text-fg-muted">
      {{ t('reservations.quote.selectDates') }}
    </div>

    <!-- Quote display -->
    <div v-else class="space-y-4">
      <!-- Nights count -->
      <p class="text-sm text-fg-muted">
        {{ t('reservations.quote.nights', { count: String(quote.nights) }) }}
      </p>

      <!-- Lines detail -->
      <div class="divide-y divide-border">
        <div
          v-for="(line, idx) in quote.lines"
          :key="idx"
          class="flex items-center justify-between py-2 text-sm"
        >
          <div class="flex flex-col">
            <span class="font-medium text-fg">{{ lineLabel(line) }}</span>
            <span class="text-fg-muted">
              {{ line.quantity }} x {{ formatCurrency(line.unitPrice) }}
              <span v-if="line.isWeekly">({{ t('reservations.quote.perWeek') }})</span>
              <span v-else>({{ t('reservations.quote.perNight') }})</span>
            </span>
          </div>
          <span class="font-medium text-fg">{{ formatCurrency(line.amount) }}</span>
        </div>
      </div>

      <!-- Total -->
      <div class="flex items-center justify-between border-t border-border pt-3">
        <span class="font-semibold text-fg">{{ t('reservations.quote.total') }}</span>
        <span class="text-lg font-bold text-brand">{{ formatCurrency(quote.total) }}</span>
      </div>

      <!-- Deposit -->
      <div v-if="quote.deposit !== null" class="flex items-center justify-between text-sm">
        <span class="text-fg-muted">{{ t('reservations.quote.deposit') }}</span>
        <span class="font-medium text-fg">{{ formatCurrency(quote.deposit) }}</span>
      </div>

      <!-- Bounds warning -->
      <BaseAlert v-if="!quote.withinBounds" variant="warning">
        <span v-if="quote.boundsError === 'below_min'">
          {{ t('reservations.quote.belowMin', { min: String(quote.minDays) }) }}
        </span>
        <span v-else-if="quote.boundsError === 'above_max'">
          {{ t('reservations.quote.aboveMax', { max: String(quote.maxDays) }) }}
        </span>
      </BaseAlert>

      <!-- Apply button -->
      <div class="flex justify-end">
        <BaseButton size="sm" variant="secondary" @click="emit('apply', quote.total)">
          {{ t('reservations.quote.apply') }}
        </BaseButton>
      </div>
    </div>
  </BaseCard>
</template>
