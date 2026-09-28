<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import SettingsShell from '~/components/settings/SettingsShell.vue'
import SettingsBillingTab from '~/components/settings/tabs/SettingsBillingTab.vue'
import SettingsOnlinePayments from '~/components/settings/SettingsOnlinePayments.vue'
import { useT } from '~/composables/use_t'
import type {
  ActiveAddonInfo,
  ActiveModuleInfo,
  PlanTier,
  QuotaUsage,
} from '../../../shared/types/plan'
import type { SubscriptionInfo } from '../../../shared/types/billing'
import type { OnlinePaymentsSettings } from '../../../shared/types/online_payment'

defineProps<{
  plan: PlanTier
  quotaUsage: QuotaUsage
  subscription: SubscriptionInfo | null
  orgModules: ActiveModuleInfo[]
  orgAddons: ActiveAddonInfo[]
  onlinePayments: OnlinePaymentsSettings
}>()

const { t } = useT()
</script>

<template>
  <Head :title="t('settings.billing.title')" />
  <SettingsShell>
    <SettingsBillingTab
      :plan="plan"
      :quota-usage="quotaUsage"
      :subscription="subscription"
      :org-modules="orgModules"
      :org-addons="orgAddons"
    />
    <SettingsOnlinePayments :settings="onlinePayments" class="mt-6" />
  </SettingsShell>
</template>
