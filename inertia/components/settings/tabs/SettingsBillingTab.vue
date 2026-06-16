<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import SettingsBillingUsageGauge from '~/components/settings/SettingsBillingUsageGauge.vue'
import { useT } from '~/composables/use_t'
import type { PlanTier, QuotaUsage } from '../../../../shared/types/plan'
import type {
  BillingInterval,
  SubscriptionInfo,
  SubscriptionStatus,
} from '../../../../shared/types/billing'
import { getUpgradeTier } from '../../../../shared/types/plan'
import { computed, ref } from 'vue'
import { useForm } from '@inertiajs/vue3'

const { t } = useT()

const props = defineProps<{
  plan: PlanTier
  quotaUsage: QuotaUsage
  subscription: SubscriptionInfo | null
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const statusVariant = computed((): 'success' | 'warning' | 'neutral' => {
  const s = props.subscription?.status as SubscriptionStatus | undefined
  if (s === 'active' || s === 'trialing') return 'success'
  if (s === 'past_due' || s === 'incomplete' || s === 'unpaid') return 'warning'
  return 'neutral'
})
</script>

<template>
  <div>
    <BaseHeading level="2" class="mb-6">{{ t('settings.billing.title') }}</BaseHeading>
    <div class="space-y-6">
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
          <div v-if="subscription" class="rounded-lg bg-surface-2 p-3 text-sm space-y-1">
            <p v-if="!subscription.cancelAtPeriodEnd" class="text-fg-muted">
              {{
                t('settings.billing.subscription.renewsOn', {
                  date: formatDate(subscription.currentPeriodEnd),
                })
              }}
              &mdash;
              {{ t(`settings.billing.subscription.interval.${subscription.billingInterval}`) }}
            </p>
            <p v-else class="text-amber-600 font-medium">
              {{ t('settings.billing.subscription.cancelAtPeriodEnd') }}
              {{ formatDate(subscription.currentPeriodEnd) }}
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

          <!-- Features -->
          <ul class="space-y-2 text-sm">
            <li
              class="flex items-center gap-2"
              :class="quotaUsage.canUseAI ? 'text-fg' : 'text-fg-muted'"
            >
              <span :class="quotaUsage.canUseAI ? 'text-green-600' : 'text-fg-muted'">
                {{ quotaUsage.canUseAI ? '✓' : '✗' }}
              </span>
              {{ t('settings.billing.features.ai') }}
            </li>
            <li
              class="flex items-center gap-2"
              :class="quotaUsage.canExport ? 'text-fg' : 'text-fg-muted'"
            >
              <span :class="quotaUsage.canExport ? 'text-green-600' : 'text-fg-muted'">
                {{ quotaUsage.canExport ? '✓' : '✗' }}
              </span>
              {{ t('settings.billing.features.export') }}
            </li>
            <li class="flex items-center gap-2 text-fg">
              <span class="text-green-600">✓</span>
              {{ t('settings.billing.features.maintenanceHistory') }}
            </li>
          </ul>
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
                  interval === 'year'
                    ? 'bg-brand text-white'
                    : 'bg-surface-2 text-fg-muted hover:text-fg'
                "
                @click="interval = 'year'"
              >
                {{ t('settings.billing.subscription.interval.year') }}
                <span class="rounded bg-green-100 px-1 text-xs font-semibold text-green-700">
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
    </div>
  </div>
</template>
