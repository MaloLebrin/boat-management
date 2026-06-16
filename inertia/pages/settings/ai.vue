<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import SettingsShell from '~/components/settings/SettingsShell.vue'
import SettingsAiTab from '~/components/settings/tabs/SettingsAiTab.vue'

defineProps<{
  aiSystemPrompt: string | null
  aiModelOverride: string | null
}>()
</script>

<template>
  <SettingsShell>
    <SettingsAiTab :ai-system-prompt="aiSystemPrompt" :ai-model-override="aiModelOverride" />
  </SettingsShell>
</template>
