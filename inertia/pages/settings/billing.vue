<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import SettingsShell from '~/components/settings/SettingsShell.vue'
import SettingsBillingTab from '~/components/settings/tabs/SettingsBillingTab.vue'
</script>

<template>
  <SettingsShell>
    <SettingsBillingTab />
  </SettingsShell>
</template>
