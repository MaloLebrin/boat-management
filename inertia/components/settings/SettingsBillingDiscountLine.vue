<script setup lang="ts">
import { computed } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type { BillingInterval, SubscriptionDiscountInfo } from '../../../shared/types/billing'

/**
 * Remise active de l'abonnement (#955) : « Remise −50 % jusqu'au 12 mars 2027 ·
 * code ASSO50 ». Un coupon porte soit un pourcentage, soit un montant par
 * période de facturation.
 */
const props = defineProps<{
  discount: SubscriptionDiscountInfo
  billingInterval: BillingInterval
}>()

const { t } = useT()
const { formatDateLong } = useDateFormat()
const { formatNumber, formatCurrency } = useNumberFormat()

const amountText = computed(() => {
  const { percentOff, amountOffCents, currency } = props.discount
  if (percentOff !== null) {
    const percent = formatNumber(percentOff / 100, { style: 'percent', maximumFractionDigits: 2 })
    return t('settings.billing.discount.percentOff', { percent })
  }
  if (amountOffCents !== null) {
    const amount = formatCurrency(amountOffCents / 100, { currency: currency ?? undefined })
    return t(`settings.billing.discount.amountOff.${props.billingInterval}`, { amount })
  }
  return ''
})

const durationText = computed(() => {
  const { duration, durationInMonths, end } = props.discount
  if (duration === 'forever') return t('settings.billing.discount.forever')
  if (duration === 'once') return t('settings.billing.discount.once')
  if (end) return t('settings.billing.discount.until', { date: formatDateLong(end) })
  if (durationInMonths !== null) {
    return t('settings.billing.discount.months', { count: String(durationInMonths) })
  }
  return ''
})
</script>

<template>
  <p class="flex flex-wrap items-center gap-x-2 gap-y-1">
    <BaseBadge variant="success">{{ t('settings.billing.discount.label') }}</BaseBadge>
    <span class="font-medium text-success">{{ amountText }}</span>
    <span v-if="durationText" class="text-fg-muted">{{ durationText }}</span>
    <span v-if="discount.promoCode" class="text-fg-subtle">
      {{ t('settings.billing.discount.code', { code: discount.promoCode }) }}
    </span>
  </p>
</template>
