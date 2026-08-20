<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import SettingsShell from '~/components/settings/SettingsShell.vue'
import SettingsBrandingTab from '~/components/settings/tabs/SettingsBrandingTab.vue'
import { useT } from '~/composables/use_t'
import type { BrandingConfig } from '../../../shared/types/branding'

defineProps<{
  branding: BrandingConfig
}>()

const { t } = useT()
</script>

<template>
  <Head :title="t('settings.branding.title')" />
  <SettingsShell>
    <SettingsBrandingTab :branding="branding" />
  </SettingsShell>
</template>
