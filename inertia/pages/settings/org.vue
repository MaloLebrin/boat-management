<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import SettingsShell from '~/components/settings/SettingsShell.vue'
import SettingsOrgTab from '~/components/settings/tabs/SettingsOrgTab.vue'

defineProps<{
  organization: {
    id: number
    name: string
  }
}>()
</script>

<template>
  <SettingsShell>
    <SettingsOrgTab :organization="organization" />
  </SettingsShell>
</template>
