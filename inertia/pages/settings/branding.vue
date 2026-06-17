<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import SettingsShell from '~/components/settings/SettingsShell.vue'
import SettingsBrandingTab from '~/components/settings/tabs/SettingsBrandingTab.vue'
import type { BrandingConfig } from '../../../shared/types/branding'

defineProps<{
  branding: BrandingConfig
}>()
</script>

<template>
  <SettingsShell>
    <SettingsBrandingTab :branding="branding" />
  </SettingsShell>
</template>
