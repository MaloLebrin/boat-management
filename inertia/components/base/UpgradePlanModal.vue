<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePage, useForm } from '@inertiajs/vue3'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import { PLAN_LIMITS, PLAN_PRICES, getUpgradeTier } from '../../../shared/types/plan'
import type { PlanTier } from '../../../shared/types/plan'
import type { BillingInterval } from '../../../shared/types/billing'

const props = defineProps<{
  open: boolean
  feature: 'boats' | 'members' | 'ai' | 'export'
}>()

const emit = defineEmits<{ 'update:open': [boolean] }>()

const { t } = useT()
const page = usePage()

const currentPlan = computed<PlanTier>(
  () => (page.props.currentPlan as PlanTier | undefined) ?? 'starter'
)
const upgradeTier = computed(() => getUpgradeTier(currentPlan.value))

const interval = ref<BillingInterval>('month')
const checkoutForm = useForm({})

function startCheckout() {
  const tier = upgradeTier.value
  if (!tier) return
  checkoutForm
    .transform(() => ({ planTier: tier, interval: interval.value }))
    .post('/settings/billing/checkout')
}

const featureLimit = computed<number | null>(() => {
  const limits = PLAN_LIMITS[currentPlan.value]
  if (props.feature === 'boats') return limits.maxBoats
  if (props.feature === 'members') return limits.maxMembers
  return null
})

const upgradePrice = computed<number | null>(() => {
  if (!upgradeTier.value) return null
  const prices = PLAN_PRICES[upgradeTier.value]
  return interval.value === 'month' ? prices.monthly : prices.annualMonthly
})

const featureDescriptionKey = computed(() => `settings.upgrade.${props.feature}`)

const modalTitle = computed(() =>
  upgradeTier.value
    ? t(`settings.billing.upgradeTo.${upgradeTier.value}`)
    : t('settings.billing.planName.enterprise')
)
</script>

<template>
  <BaseModal :open="open" :title="modalTitle" size="md" @update:open="emit('update:open', $event)">
    <div class="space-y-5">
      <!-- Description de la feature bloquée -->
      <p class="text-sm text-fg-muted">
        <template v-if="featureLimit !== null">
          {{ t(featureDescriptionKey, { limit: String(featureLimit) }) }}
        </template>
        <template v-else>
          {{ t(featureDescriptionKey) }}
        </template>
      </p>

      <!-- Prix du plan cible -->
      <div v-if="upgradeTier && upgradePrice !== null" class="rounded-lg bg-surface-2 px-4 py-3">
        <p class="text-xs font-medium uppercase tracking-wide text-fg-muted">
          {{ t(`settings.billing.planName.${upgradeTier}`) }}
        </p>
        <p class="mt-1 text-2xl font-bold text-fg">
          {{ upgradePrice }}
          <span class="text-base font-normal text-fg-muted"
            >€ / {{ t('settings.billing.subscription.interval.month').toLowerCase() }}</span
          >
        </p>
        <p v-if="interval === 'year'" class="mt-0.5 text-xs text-fg-muted">
          {{
            t('settings.upgrade.priceAnnual', {
              total: String(PLAN_PRICES[upgradeTier].annualTotal),
            })
          }}
        </p>
      </div>

      <!-- Toggle mensuel / annuel -->
      <div v-if="upgradeTier" class="flex gap-2">
        <button
          type="button"
          class="rounded-md px-3 py-1 text-sm font-medium transition-colors"
          :class="
            interval === 'month'
              ? 'bg-brand text-white'
              : 'bg-surface-2 text-fg-muted hover:text-fg'
          "
          @click="interval = 'month'"
        >
          {{ t('settings.billing.subscription.interval.month') }}
        </button>
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors"
          :class="
            interval === 'year' ? 'bg-brand text-white' : 'bg-surface-2 text-fg-muted hover:text-fg'
          "
          @click="interval = 'year'"
        >
          {{ t('settings.billing.subscription.interval.year') }}
          <span class="rounded bg-green-100 px-1 text-xs font-semibold text-green-700">
            {{ t('settings.billing.subscription.annualDiscount') }}
          </span>
        </button>
      </div>
    </div>

    <template #footer>
      <!-- Enterprise déjà sur le plan max -->
      <p v-if="!upgradeTier" class="text-sm text-fg-muted">
        {{ t('settings.upgrade.contactUs') }}
      </p>
      <!-- Bouton upgrade -->
      <div v-else class="flex gap-3">
        <BaseButton variant="secondary" size="sm" @click="emit('update:open', false)">
          {{ t('settings.upgrade.cancel') }}
        </BaseButton>
        <BaseButton
          variant="primary"
          size="sm"
          :loading="checkoutForm.processing"
          @click="startCheckout"
        >
          {{ t(`settings.billing.upgradeTo.${upgradeTier}`) }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
