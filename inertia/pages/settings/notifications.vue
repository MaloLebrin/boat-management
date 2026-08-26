<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import SettingsShell from '~/components/settings/SettingsShell.vue'
import SettingsNotificationsTab from '~/components/settings/tabs/SettingsNotificationsTab.vue'
import { useT } from '~/composables/use_t'
import type { PushSubscriptionRow } from '../../../shared/types/push'

defineProps<{
  pushSubscriptions: PushSubscriptionRow[]
}>()

const { t } = useT()
</script>

<template>
  <Head :title="t('settings.notifications.title')" />
  <SettingsShell>
    <SettingsNotificationsTab :push-subscriptions="pushSubscriptions" />
  </SettingsShell>
</template>
