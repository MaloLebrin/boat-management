<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { AI_PROVIDERS, AI_PROVIDER_LABELS, type AiProvider } from '#shared/types/ai'
import { useT } from '~/composables/use_t'

const { t } = useT()

const props = defineProps<{
  aiProvider: AiProvider | null
  configuredProviders: Record<AiProvider, boolean>
}>()

// '' = défaut de l'app (clé Mistral de l'app + quota) — envoyé comme null.
const selected = ref<string>(props.aiProvider ?? '')
const saving = ref(false)

// Seuls les fournisseurs avec une clé enregistrée sont sélectionnables — le
// backend refuse de toute façon un fournisseur sans clé.
const options = computed(() => [
  { label: t('settings.ai.activeProvider.appDefault'), value: '' },
  ...AI_PROVIDERS.filter((provider) => props.configuredProviders[provider]).map((provider) => ({
    label: AI_PROVIDER_LABELS[provider],
    value: provider,
  })),
])

function save() {
  if (saving.value) return
  router.put(
    '/settings/ai/provider',
    { aiProvider: selected.value || null },
    {
      preserveScroll: true,
      onStart: () => {
        saving.value = true
      },
      onFinish: () => {
        saving.value = false
      },
    }
  )
}
</script>

<template>
  <BaseCard>
    <div class="space-y-3">
      <BaseHeading level="3">{{ t('settings.ai.activeProvider.title') }}</BaseHeading>
      <p class="text-sm text-fg-muted">{{ t('settings.ai.activeProvider.description') }}</p>
      <BaseSelect
        name="aiProvider"
        :label="t('settings.ai.activeProvider.label')"
        :model-value="selected"
        :options="options"
        @update:model-value="selected = String($event)"
      />
    </div>
    <template #footer>
      <div class="flex justify-end">
        <BaseButton type="button" variant="primary" :disabled="saving" @click="save">
          {{ t('settings.ai.activeProvider.save') }}
        </BaseButton>
      </div>
    </template>
  </BaseCard>
</template>
