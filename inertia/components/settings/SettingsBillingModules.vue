<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useT } from '~/composables/use_t'
import { computed } from 'vue'
import { router } from '@inertiajs/vue3'
import { MODULE_PRICES, PLAN_MODULES } from '../../../shared/types/plan'
import type { ActiveModuleInfo, PlanModule, PlanTier } from '../../../shared/types/plan'
import type { SubscriptionInfo } from '../../../shared/types/billing'

const { t } = useT()

const props = defineProps<{
  plan: PlanTier
  subscription: SubscriptionInfo | null
  activeModules: ActiveModuleInfo[]
  canManageBilling: boolean
}>()

const bySource = computed(() => new Map(props.activeModules.map((m) => [m.module, m.source])))

// Un abonné Pro avec un abonnement actif peut activer/résilier des modules —
// réservé à `subscription.manage` (admin), cf. #397.
const canManage = computed(
  () => props.canManageBilling && props.plan === 'pro' && props.subscription !== null
)
const canManageEnterprise = computed(() => props.canManageBilling)

function priceLabel(module: PlanModule): string {
  const interval = props.subscription?.billingInterval ?? 'month'
  const price = MODULE_PRICES[module]
  const amount = interval === 'year' ? price.annualMonthly : price.monthly
  return t('settings.billing.modules.pricePerMonth', { amount: String(amount) })
}

function addModule(module: PlanModule) {
  router.post('/settings/billing/module', { module }, { preserveScroll: true })
}

function removeModule(module: PlanModule) {
  router.delete('/settings/billing/module', {
    data: { module },
    preserveScroll: true,
  })
}

function activateEnterpriseModule(module: PlanModule) {
  router.post('/settings/billing/module/enterprise', { module }, { preserveScroll: true })
}

function deactivateEnterpriseModule(module: PlanModule) {
  router.delete('/settings/billing/module/enterprise', {
    data: { module },
    preserveScroll: true,
  })
}
</script>

<template>
  <BaseCard>
    <template #header>
      <span class="text-sm font-semibold text-fg">{{ t('settings.billing.modules.title') }}</span>
    </template>

    <p class="mb-4 text-sm text-fg-muted">{{ t('settings.billing.modules.subtitle') }}</p>

    <ul class="space-y-3">
      <li
        v-for="module in PLAN_MODULES"
        :key="module"
        class="flex items-center justify-between gap-3 rounded-lg border border-bone bg-surface-2 p-3"
      >
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-fg">{{
              t(`settings.billing.modules.${module}.name`)
            }}</span>
            <BaseBadge v-if="bySource.get(module) === 'granted'" variant="success">
              {{ t('settings.billing.modules.granted') }}
            </BaseBadge>
            <BaseBadge v-else-if="bySource.has(module)" variant="neutral">
              {{ t('settings.billing.modules.active') }}
            </BaseBadge>
          </div>
          <p class="mt-0.5 truncate text-sm text-fg-muted">
            {{ t(`settings.billing.modules.${module}.desc`) }}
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-3">
          <span v-if="plan !== 'enterprise'" class="text-sm font-semibold text-fg">
            {{ priceLabel(module) }}
          </span>

          <!-- Enterprise : toggle self-service d'un module inclus (#353) -->
          <template v-if="plan === 'enterprise' && canManageEnterprise">
            <BaseButton
              v-if="bySource.get(module) === 'granted'"
              variant="secondary"
              size="sm"
              @click="deactivateEnterpriseModule(module)"
            >
              {{ t('settings.billing.modules.deactivateIncluded') }}
            </BaseButton>
            <BaseButton
              v-else
              variant="primary"
              size="sm"
              @click="activateEnterpriseModule(module)"
            >
              {{ t('settings.billing.modules.activate') }}
            </BaseButton>
          </template>

          <!-- Enterprise, sans subscription.manage -->
          <span v-else-if="plan === 'enterprise'" class="text-sm text-fg-muted">
            {{ t('settings.billing.modules.adminOnly') }}
          </span>

          <!-- Module offert (Pro, grandfathering) : pas de résiliation -->
          <span v-else-if="bySource.get(module) === 'granted'" class="text-sm text-fg-muted">
            {{ t('settings.billing.modules.grantedHint') }}
          </span>

          <!-- Abonné Pro : activer / résilier -->
          <template v-else-if="canManage">
            <BaseButton
              v-if="bySource.has(module)"
              variant="secondary"
              size="sm"
              @click="removeModule(module)"
            >
              {{ t('settings.billing.modules.deactivate') }}
            </BaseButton>
            <BaseButton v-else variant="primary" size="sm" @click="addModule(module)">
              {{ t('settings.billing.modules.activate') }}
            </BaseButton>
          </template>

          <!-- Pro abonné, sans subscription.manage -->
          <span v-else-if="plan === 'pro' && subscription !== null" class="text-sm text-fg-muted">
            {{ t('settings.billing.modules.adminOnly') }}
          </span>

          <!-- Non éligible (Starter, ou Pro sans abonnement actif) -->
          <span v-else class="text-sm text-fg-muted">
            {{ t('settings.billing.modules.proRequired') }}
          </span>
        </div>
      </li>
    </ul>
  </BaseCard>
</template>
