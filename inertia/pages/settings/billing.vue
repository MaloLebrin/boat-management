<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import SettingsShell from '~/components/settings/SettingsShell.vue'
import SettingsBillingTab from '~/components/settings/tabs/SettingsBillingTab.vue'
import type { PlanTier, QuotaUsage } from '../../../shared/types/plan'

defineProps<{
  plan: PlanTier
  quotaUsage: QuotaUsage
}>()
</script>

<template>
  <SettingsShell>
    <SettingsBillingTab :plan="plan" :quota-usage="quotaUsage" />
  </SettingsShell>
</template>
