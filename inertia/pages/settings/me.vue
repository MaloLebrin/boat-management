<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import SettingsShell from '~/components/settings/SettingsShell.vue'
import SettingsMeTab from '~/components/settings/tabs/SettingsMeTab.vue'

defineProps<{
  user: {
    id: number
    email: string
    fullName: string | null
  }
}>()
</script>

<template>
  <SettingsShell>
    <SettingsMeTab :user="user" />
  </SettingsShell>
</template>
