<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import SettingsShell from '~/components/settings/SettingsShell.vue'
import SettingsMeTab from '~/components/settings/tabs/SettingsMeTab.vue'
import { useT } from '~/composables/use_t'
import type { TwoFactorSettingsProps } from '#shared/types/two_factor'
import type { UserSessionsSettingsProps } from '#shared/types/user_session'

defineProps<{ twoFactor: TwoFactorSettingsProps; sessions: UserSessionsSettingsProps }>()

const { t } = useT()
</script>

<template>
  <Head :title="t('settings.me.title')" />
  <SettingsShell>
    <SettingsMeTab :two-factor="twoFactor" :sessions="sessions" />
  </SettingsShell>
</template>
