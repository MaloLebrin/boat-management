<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import SettingsShell from '~/components/settings/SettingsShell.vue'
import SettingsAiTab from '~/components/settings/tabs/SettingsAiTab.vue'
import { useT } from '~/composables/use_t'
import type { AiProvider } from '#shared/types/ai'

defineProps<{
  aiSystemPrompt: string | null
  aiModelOverride: string | null
  aiProvider: AiProvider | null
  configuredProviders: Record<AiProvider, boolean>
}>()

const { t } = useT()
</script>

<template>
  <Head :title="t('settings.ai.title')" />
  <SettingsShell>
    <SettingsAiTab
      :ai-system-prompt="aiSystemPrompt"
      :ai-model-override="aiModelOverride"
      :ai-provider="aiProvider"
      :configured-providers="configuredProviders"
    />
  </SettingsShell>
</template>
