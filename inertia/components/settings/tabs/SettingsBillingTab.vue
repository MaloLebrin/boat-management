<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import SettingsBillingUsageGauge from '~/components/settings/SettingsBillingUsageGauge.vue'
import SettingsBillingFeatureList from '~/components/settings/SettingsBillingFeatureList.vue'
import SettingsBillingModules from '~/components/settings/SettingsBillingModules.vue'
import SettingsBillingExtraBoats from '~/components/settings/SettingsBillingExtraBoats.vue'
import SettingsBillingSubscriptionNotice from '~/components/settings/SettingsBillingSubscriptionNotice.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type {
  ActiveAddonInfo,
  ActiveModuleInfo,
  PlanTier,
  QuotaUsage,
} from '../../../../shared/types/plan'
import type {
  BillingInterval,
  SubscriptionInfo,
  SubscriptionStatus,
} from '../../../../shared/types/billing'
import { getUpgradeTier } from '../../../../shared/types/plan'
import { computed, ref } from 'vue'
import { useForm } from '@inertiajs/vue3'
import { usePermissions } from '~/composables/use_permissions'

const { t } = useT()
const { formatDateLong } = useDateFormat()
const { can } = usePermissions()
const canManageBilling = computed(() => can('subscription.manage'))

const props = defineProps<{
  plan: PlanTier
  quotaUsage: QuotaUsage
  subscription: SubscriptionInfo | null
  orgModules: ActiveModuleInfo[]
  orgAddons: ActiveAddonInfo[]
}>()

const interval = ref<BillingInterval>('month')
const upgradeTier = computed(() => getUpgradeTier(props.plan))

const checkoutForm = useForm({})
const portalForm = useForm({})

function startCheckout(planTier: 'pro' | 'enterprise') {
  checkoutForm
    .transform(() => ({ planTier, interval: interval.value }))
    .post('/settings/billing/checkout')
}

function openPortal() {
  portalForm.post('/settings/billing/portal')
}

const statusVariant = computed((): 'success' | 'warning' | 'neutral' => {
  const s = props.subscription?.status as SubscriptionStatus | undefined
  if (s === 'active' || s === 'trialing') return 'success'
  if (s === 'past_due' || s === 'incomplete' || s === 'unpaid') return 'warning'
  return 'neutral'
})

const storageOverflow = computed(() => {
  const { usedBytes, limitBytes } = props.quotaUsage.storage
  return limitBytes !== null && usedBytes >= limitBytes
})
</script>

<template>
  <div>
    <BaseHeading level="2" class="mb-6">{{ t('settings.billing.title') }}</BaseHeading>
    <div class="space-y-6">
      <div
        v-if="storageOverflow"
        class="rounded-lg border border-coral-200 bg-danger-soft p-4 text-sm text-danger-strong"
      >
        {{ t('settings.billing.storageOverflow') }}
      </div>
      <BaseCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-fg">{{
              t('settings.billing.currentPlan')
            }}</span>
            <div class="flex items-center gap-2">
              <BaseBadge v-if="subscription" :variant="statusVariant">
                {{ t(`settings.billing.subscription.status.${subscription.status}`) }}
              </BaseBadge>
              <span
                class="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand"
              >
                {{ t(`settings.billing.planName.${plan}`) }}
              </span>
            </div>
          </div>
        </template>

        <div class="space-y-5">
          <!-- Subscription info -->
          <div v-if="subscription" class="rounded-lg bg-surface-muted p-3 text-sm space-y-1">
            <p v-if="!subscription.cancelAtPeriodEnd" class="text-fg-muted">
              {{
                t('settings.billing.subscription.renewsOn', {
                  date: formatDateLong(subscription.currentPeriodEnd),
                })
              }}
              &mdash;
              {{ t(`settings.billing.subscription.interval.${subscription.billingInterval}`) }}
            </p>
            <p v-else class="text-amber-600 font-medium">
              {{ t('settings.billing.subscription.cancelAtPeriodEnd') }}
              {{ formatDateLong(subscription.currentPeriodEnd) }}
            </p>
          </div>

          <!-- Boats usage -->
          <SettingsBillingUsageGauge
            :label="t('settings.billing.usage.boats')"
            :used="quotaUsage.boats.used"
            :limit="quotaUsage.boats.limit"
          />

          <!-- Members usage -->
          <SettingsBillingUsageGauge
            :label="t('settings.billing.usage.members')"
            :used="quotaUsage.members.used"
            :limit="quotaUsage.members.limit"
          />

          <!-- Storage usage -->
          <SettingsBillingUsageGauge
            :label="t('settings.billing.usage.storage')"
            :used="quotaUsage.storage.usedBytes"
            :limit="quotaUsage.storage.limitBytes"
            :is-bytes="true"
          />

          <!-- AI tokens usage (Pro only) -->
          <SettingsBillingUsageGauge
            v-if="quotaUsage.canUseAI"
            :label="t('settings.billing.usage.aiTokens')"
            :used="quotaUsage.aiTokens.used"
            :limit="quotaUsage.aiTokens.limit"
          />

          <!-- Features -->
          <SettingsBillingFeatureList :plan="plan" :quota-usage="quotaUsage" />
        </div>

        <template #footer>
          <!-- Abonné : bouton portail -->
          <div v-if="subscription">
            <BaseButton
              variant="secondary"
              size="sm"
              :loading="portalForm.processing"
              @click="openPortal"
            >
              {{ t('settings.billing.subscription.manage') }}
            </BaseButton>
          </div>

          <!-- Non abonné : sélecteur intervalle + bouton upgrade -->
          <div v-else-if="upgradeTier" class="space-y-3">
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-md px-3 py-1 text-sm font-medium transition-colors"
                :class="
                  interval === 'month'
                    ? 'bg-brand text-white'
                    : 'bg-surface-muted text-fg-muted hover:text-fg'
                "
                @click="interval = 'month'"
              >
                {{ t('settings.billing.subscription.interval.month') }}
              </button>
              <button
                type="button"
                class="flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors"
                :class="
                  interval === 'year'
                    ? 'bg-brand text-white'
                    : 'bg-surface-muted text-fg-muted hover:text-fg'
                "
                @click="interval = 'year'"
              >
                {{ t('settings.billing.subscription.interval.year') }}
                <span class="rounded bg-mint-100 px-1 text-xs font-semibold text-success">
                  {{ t('settings.billing.subscription.annualDiscount') }}
                </span>
              </button>
            </div>
            <BaseButton
              variant="primary"
              :loading="checkoutForm.processing"
              @click="startCheckout(upgradeTier as 'pro' | 'enterprise')"
            >
              {{ t(`settings.billing.upgradeTo.${upgradeTier}`) }}
            </BaseButton>
          </div>
        </template>
      </BaseCard>

      <!-- Plan Pro en base mais aucun abonnement Stripe actif (#456) : sans ce
           rappel, les cartes ci-dessous parlent d'« activer l'abonnement Pro »
           à quelqu'un qui se sait déjà Pro. -->
      <SettingsBillingSubscriptionNotice
        v-if="plan === 'pro' && subscription === null"
        :plan="plan"
        :can-manage-billing="canManageBilling"
        @activate-subscription="startCheckout('pro')"
      />

      <SettingsBillingModules
        :plan="plan"
        :subscription="subscription"
        :active-modules="orgModules"
        :can-manage-billing="canManageBilling"
        @activate-subscription="startCheckout('pro')"
      />

      <SettingsBillingExtraBoats
        :plan="plan"
        :subscription="subscription"
        :active-addons="orgAddons"
        :can-manage-billing="canManageBilling"
        @activate-subscription="startCheckout('pro')"
      />
    </div>
  </div>
</template>
