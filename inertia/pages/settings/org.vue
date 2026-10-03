<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import SettingsShell from '~/components/settings/SettingsShell.vue'
import SettingsOrgTab from '~/components/settings/tabs/SettingsOrgTab.vue'
import { useT } from '~/composables/use_t'
import type { OrganizationTwoFactorPolicy } from '#shared/types/two_factor'
import type { OrganizationDeletionProps } from '#shared/types/account'
import type { OrganizationSettingsData } from '#shared/types/organization'

defineProps<{
  organization: OrganizationSettingsData
  twoFactorPolicy: OrganizationTwoFactorPolicy
  deletion: OrganizationDeletionProps
}>()

const { t } = useT()
</script>

<template>
  <Head :title="t('settings.org.title')" />
  <SettingsShell>
    <SettingsOrgTab
      :organization="organization"
      :two-factor-policy="twoFactorPolicy"
      :deletion="deletion"
    />
  </SettingsShell>
</template>
