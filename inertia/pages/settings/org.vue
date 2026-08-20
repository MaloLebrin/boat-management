<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import SettingsShell from '~/components/settings/SettingsShell.vue'
import SettingsOrgTab from '~/components/settings/tabs/SettingsOrgTab.vue'
import { useT } from '~/composables/use_t'

defineProps<{
  organization: {
    id: number
    name: string
  }
}>()

const { t } = useT()
</script>

<template>
  <Head :title="t('settings.org.title')" />
  <SettingsShell>
    <SettingsOrgTab :organization="organization" />
  </SettingsShell>
</template>
