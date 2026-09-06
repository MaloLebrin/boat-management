<script setup lang="ts">
import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import BaseHeading from '~/components/base/BaseHeading.vue'
import AiActiveProviderCard from '~/components/settings/ai/AiActiveProviderCard.vue'
import AiCustomizationCard from '~/components/settings/ai/AiCustomizationCard.vue'
import AiProviderKeyCard from '~/components/settings/ai/AiProviderKeyCard.vue'
import { useT } from '~/composables/use_t'
import { AI_PROVIDERS, type AiProvider } from '#shared/types/ai'
import { PLAN_LIMITS, type PlanTier } from '#shared/types/plan'

const { t } = useT()
const page = usePage()

defineProps<{
  aiSystemPrompt: string | null
  aiModelOverride: string | null
  aiProvider: AiProvider | null
  configuredProviders: Record<AiProvider, boolean>
}>()

// La page s'ouvre dès `canUseAI` (clés API BYOK) ; prompt/modèle restent
// réservés à `canCustomizeAI` — le backend garde le même partage.
const canCustomizeAI = computed(() => {
  const plan = (page.props.currentPlan as PlanTier | undefined) ?? 'starter'
  return PLAN_LIMITS[plan].canCustomizeAI
})
</script>

<template>
  <div>
    <BaseHeading level="2" class="mb-2">{{ t('settings.ai.title') }}</BaseHeading>
    <p class="text-fg-muted mb-6 text-sm">{{ t('settings.ai.description') }}</p>

    <!-- Clés API par fournisseur (BYOK) — write-only, jamais réaffichées -->
    <section class="mb-6 space-y-4">
      <div>
        <BaseHeading level="3" class="mb-1">{{ t('settings.ai.apiKeys.title') }}</BaseHeading>
        <p class="text-sm text-fg-muted">{{ t('settings.ai.apiKeys.description') }}</p>
      </div>
      <AiProviderKeyCard
        v-for="provider in AI_PROVIDERS"
        :key="provider"
        :provider="provider"
        :configured="configuredProviders[provider]"
      />
    </section>

    <!-- Fournisseur actif — seul le copilote FleetAi consomme la clé BYOK -->
    <div class="mb-6">
      <AiActiveProviderCard :ai-provider="aiProvider" :configured-providers="configuredProviders" />
    </div>

    <!-- Personnalisation (prompt + modèle) — enterprise uniquement -->
    <AiCustomizationCard
      v-if="canCustomizeAI"
      :ai-system-prompt="aiSystemPrompt"
      :ai-model-override="aiModelOverride"
      :ai-provider="aiProvider"
    />
  </div>
</template>
