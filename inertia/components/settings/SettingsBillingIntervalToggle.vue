<script setup lang="ts">
import { useT } from '~/composables/use_t'
import type { BillingInterval } from '../../../shared/types/billing'

/**
 * Sélecteur mensuel / annuel du checkout, partagé par l'onglet Facturation et
 * la modale d'upgrade (#955). Le badge « −20 % » rappelle la remise annuelle.
 */
defineProps<{ interval: BillingInterval }>()

const emit = defineEmits<{ 'update:interval': [value: BillingInterval] }>()

const { t } = useT()

function buttonClass(active: boolean): string {
  return active ? 'bg-brand text-on-brand' : 'bg-surface-muted text-fg-muted hover:text-fg'
}
</script>

<template>
  <div class="flex gap-2">
    <button
      type="button"
      class="rounded-md px-3 py-1 text-sm font-medium transition-colors"
      :class="buttonClass(interval === 'month')"
      :aria-pressed="interval === 'month'"
      @click="emit('update:interval', 'month')"
    >
      {{ t('settings.billing.subscription.interval.month') }}
    </button>
    <button
      type="button"
      class="flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors"
      :class="buttonClass(interval === 'year')"
      :aria-pressed="interval === 'year'"
      @click="emit('update:interval', 'year')"
    >
      {{ t('settings.billing.subscription.interval.year') }}
      <span class="rounded bg-mint-100 px-1 text-xs font-semibold text-mint-700">
        {{ t('settings.billing.subscription.annualDiscount') }}
      </span>
    </button>
  </div>
</template>
