<script setup lang="ts">
import { computed, ref } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { AI_MODELS_BY_PROVIDER, aiModelI18nKey, type AiProvider } from '#shared/types/ai'
import { useT } from '~/composables/use_t'

const { t } = useT()

const props = defineProps<{
  aiSystemPrompt: string | null
  aiModelOverride: string | null
  aiProvider: AiProvider | null
}>()

const systemPrompt = ref(props.aiSystemPrompt ?? '')
const modelOverride = ref(props.aiModelOverride ?? '')

// Le choix de modèle suit le fournisseur actif (null = Mistral de l'app).
const modelOptions = computed(() => [
  { label: t('settings.ai.modelOverridePlaceholder'), value: '' },
  ...AI_MODELS_BY_PROVIDER[props.aiProvider ?? 'mistral'].map((model) => ({
    label: t(`settings.ai.models.${aiModelI18nKey(model)}`),
    value: model,
  })),
])
</script>

<template>
  <Form :action="{ url: '/settings/ai', method: 'put' }" #default="{ processing, errors }">
    <BaseCard>
      <div class="space-y-6">
        <BaseTextarea
          name="aiSystemPrompt"
          :label="t('settings.ai.systemPromptLabel')"
          :placeholder="t('settings.ai.systemPromptPlaceholder')"
          :hint="t('settings.ai.systemPromptHint')"
          :model-value="systemPrompt"
          :rows="6"
          :errors="errors"
          @update:model-value="systemPrompt = $event"
        />
        <BaseSelect
          name="aiModelOverride"
          :label="t('settings.ai.modelOverrideLabel')"
          :model-value="modelOverride"
          :options="modelOptions"
          :errors="errors"
          @update:model-value="modelOverride = String($event)"
        />
      </div>
      <template #footer>
        <div class="flex justify-end">
          <BaseButton type="submit" variant="primary" :disabled="processing">
            {{ t('settings.ai.save') }}
          </BaseButton>
        </div>
      </template>
    </BaseCard>
  </Form>
</template>
