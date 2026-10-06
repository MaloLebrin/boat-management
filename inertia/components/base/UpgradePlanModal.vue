<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePage, useForm } from '@inertiajs/vue3'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import SettingsBillingIntervalToggle from '~/components/settings/SettingsBillingIntervalToggle.vue'
import SettingsBillingPromoCodeField from '~/components/settings/SettingsBillingPromoCodeField.vue'
import { useT } from '~/composables/use_t'
import { useNumberFormat } from '~/composables/use_number_format'
import { PLAN_LIMITS, PLAN_PRICES, getUpgradeTier } from '../../../shared/types/plan'
import type { PlanTier } from '../../../shared/types/plan'
import type { BillingInterval } from '../../../shared/types/billing'

const props = defineProps<{
  open: boolean
  feature: 'boats' | 'members' | 'ai' | 'export' | 'reports'
}>()

const emit = defineEmits<{ 'update:open': [boolean] }>()

const { t } = useT()
const { formatPrice } = useNumberFormat()
const page = usePage()

const currentPlan = computed<PlanTier>(
  () => (page.props.currentPlan as PlanTier | undefined) ?? 'starter'
)
const upgradeTier = computed(() => getUpgradeTier(currentPlan.value))

const interval = ref<BillingInterval>('month')
// Code promo (#955) : vérifié par le serveur, l'erreur revient sous le champ.
// `preserveState` garde la modale ouverte et la saisie en place quand le
// serveur renvoie sur le formulaire.
const checkoutForm = useForm({ promoCode: '' })

function startCheckout() {
  const tier = upgradeTier.value
  if (!tier) return
  checkoutForm
    .transform((data) => ({
      planTier: tier,
      interval: interval.value,
      ...(data.promoCode ? { promoCode: data.promoCode } : {}),
    }))
    .post('/settings/billing/checkout', { preserveState: true, preserveScroll: true })
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
      <div
        v-if="upgradeTier && upgradePrice !== null"
        class="rounded-lg bg-surface-muted px-4 py-3"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-fg-muted">
          {{ t(`settings.billing.planName.${upgradeTier}`) }}
        </p>
        <p class="mt-1 text-2xl font-bold text-fg">
          {{ formatPrice(upgradePrice) }}
          <span class="text-base font-normal text-fg-muted"
            >/ {{ t('settings.billing.subscription.interval.month').toLowerCase() }}</span
          >
        </p>
        <p v-if="interval === 'year'" class="mt-0.5 text-xs text-fg-muted">
          {{
            t('settings.upgrade.priceAnnual', {
              total: formatPrice(PLAN_PRICES[upgradeTier].annualTotal),
            })
          }}
        </p>
      </div>

      <!-- Toggle mensuel / annuel -->
      <SettingsBillingIntervalToggle v-if="upgradeTier" v-model:interval="interval" />

      <!-- Code promo (#955) -->
      <SettingsBillingPromoCodeField
        v-if="upgradeTier"
        v-model="checkoutForm.promoCode"
        :errors="checkoutForm.errors"
        :disabled="checkoutForm.processing"
      />
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
