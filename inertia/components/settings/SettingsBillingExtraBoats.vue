<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useT } from '~/composables/use_t'
import { computed, ref, watch } from 'vue'
import { router } from '@inertiajs/vue3'
import { ADDON_PRICES } from '../../../shared/types/plan'
import type { ActiveAddonInfo, PlanTier } from '../../../shared/types/plan'
import type { SubscriptionInfo } from '../../../shared/types/billing'

const MAX_EXTRA_BOATS = 100

const { t } = useT()

const props = defineProps<{
  plan: PlanTier
  subscription: SubscriptionInfo | null
  activeAddons: ActiveAddonInfo[]
}>()

const current = computed(() => props.activeAddons.find((a) => a.addon === 'extra_boats') ?? null)
const currentQuantity = computed(() => current.value?.quantity ?? 0)
const isGranted = computed(() => current.value?.source === 'granted')

// Un abonné Pro avec un abonnement actif peut régler la quantité ; les add-ons
// offerts (`granted`) et Enterprise (bateaux illimités) ne sont pas gérables ici.
const canManage = computed(
  () => props.plan === 'pro' && props.subscription !== null && !isGranted.value
)

const quantity = ref(currentQuantity.value)
watch(currentQuantity, (q) => (quantity.value = q))

function decrement() {
  if (quantity.value > 0) quantity.value -= 1
}
function increment() {
  if (quantity.value < MAX_EXTRA_BOATS) quantity.value += 1
}

const unitPrice = computed(() => {
  const interval = props.subscription?.billingInterval ?? 'month'
  const price = ADDON_PRICES.extra_boats
  return interval === 'year' ? price.annualMonthly : price.monthly
})

const totalPrice = computed(() => unitPrice.value * quantity.value)
const isDirty = computed(() => quantity.value !== currentQuantity.value)

function apply() {
  if (!isDirty.value) return
  router.post(
    '/settings/billing/addon',
    { addon: 'extra_boats', quantity: quantity.value },
    { preserveScroll: true }
  )
}
</script>

<template>
  <BaseCard>
    <template #header>
      <span class="text-sm font-semibold text-fg">{{
        t('settings.billing.extraBoats.title')
      }}</span>
    </template>

    <p class="mb-4 text-sm text-fg-muted">{{ t('settings.billing.extraBoats.subtitle') }}</p>

    <div
      class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-bone bg-surface-2 p-3"
    >
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-medium text-fg">{{ t('settings.billing.extraBoats.name') }}</span>
          <BaseBadge v-if="isGranted" variant="success">
            {{ t('settings.billing.modules.granted') }}
          </BaseBadge>
        </div>
        <p class="mt-0.5 text-sm text-fg-muted">{{ t('settings.billing.extraBoats.desc') }}</p>
        <p v-if="plan !== 'enterprise'" class="mt-1 text-sm font-semibold text-fg">
          {{ t('settings.billing.extraBoats.pricePerBoat', { amount: String(unitPrice) }) }}
        </p>
      </div>

      <!-- Enterprise : bateaux déjà illimités -->
      <BaseBadge v-if="plan === 'enterprise'" variant="success">
        {{ t('settings.billing.extraBoats.unlimited') }}
      </BaseBadge>

      <!-- Add-on offert : pas de gestion -->
      <span v-else-if="isGranted" class="text-sm text-fg-muted">
        {{ t('settings.billing.extraBoats.grantedHint', { count: String(currentQuantity) }) }}
      </span>

      <!-- Abonné Pro : stepper + application -->
      <div v-else-if="canManage" class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <BaseButton
            variant="secondary"
            size="sm"
            :disabled="quantity <= 0"
            aria-label="decrement"
            @click="decrement"
          >
            −
          </BaseButton>
          <span class="w-8 text-center font-semibold text-fg" data-testid="extra-boats-quantity">
            {{ quantity }}
          </span>
          <BaseButton
            variant="secondary"
            size="sm"
            :disabled="quantity >= MAX_EXTRA_BOATS"
            aria-label="increment"
            @click="increment"
          >
            +
          </BaseButton>
        </div>
        <div class="flex flex-col items-end gap-1">
          <span class="text-sm font-semibold text-fg">
            {{ t('settings.billing.extraBoats.totalPerMonth', { amount: String(totalPrice) }) }}
          </span>
          <BaseButton variant="primary" size="sm" :disabled="!isDirty" @click="apply">
            {{ t('settings.billing.extraBoats.apply') }}
          </BaseButton>
        </div>
      </div>

      <!-- Non éligible (Starter, ou Pro sans abonnement actif) -->
      <span v-else class="text-sm text-fg-muted">
        {{ t('settings.billing.extraBoats.proRequired') }}
      </span>
    </div>
  </BaseCard>
</template>
