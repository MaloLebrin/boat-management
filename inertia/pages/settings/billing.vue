<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import SettingsShell from '~/components/settings/SettingsShell.vue'
import SettingsBillingTab from '~/components/settings/tabs/SettingsBillingTab.vue'
import type { ActiveModuleInfo, PlanTier, QuotaUsage } from '../../../shared/types/plan'
import type { SubscriptionInfo } from '../../../shared/types/billing'

defineProps<{
  plan: PlanTier
  quotaUsage: QuotaUsage
  subscription: SubscriptionInfo | null
  activeModules: ActiveModuleInfo[]
}>()
</script>

<template>
  <SettingsShell>
    <SettingsBillingTab
      :plan="plan"
      :quota-usage="quotaUsage"
      :subscription="subscription"
      :active-modules="activeModules"
    />
  </SettingsShell>
</template>
