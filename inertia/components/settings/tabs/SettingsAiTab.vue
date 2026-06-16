<script setup lang="ts">
import { ref } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'

const { t } = useT()

const props = defineProps<{
  aiSystemPrompt: string | null
  aiModelOverride: string | null
}>()

const systemPrompt = ref(props.aiSystemPrompt ?? '')
const modelOverride = ref(props.aiModelOverride ?? '')

const modelOptions = [
  { label: t('settings.ai.modelOverridePlaceholder'), value: '' },
  { label: t('settings.ai.models.mistral-small-latest'), value: 'mistral-small-latest' },
  { label: t('settings.ai.models.mistral-medium-latest'), value: 'mistral-medium-latest' },
  { label: t('settings.ai.models.mistral-large-latest'), value: 'mistral-large-latest' },
]
</script>

<template>
  <div>
    <BaseHeading level="2" class="mb-2">{{ t('settings.ai.title') }}</BaseHeading>
    <p class="text-fg-muted mb-6 text-sm">{{ t('settings.ai.description') }}</p>
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
            @update:model-value="modelOverride = $event"
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
  </div>
</template>
