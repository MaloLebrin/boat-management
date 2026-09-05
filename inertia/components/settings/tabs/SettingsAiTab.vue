<script setup lang="ts">
import { computed, ref } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import { router, usePage } from '@inertiajs/vue3'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'
import { PLAN_LIMITS, type PlanTier } from '#shared/types/plan'

const { t } = useT()
const page = usePage()

const props = defineProps<{
  aiSystemPrompt: string | null
  aiModelOverride: string | null
  hasCustomApiKey: boolean
}>()

const systemPrompt = ref(props.aiSystemPrompt ?? '')
const modelOverride = ref(props.aiModelOverride ?? '')

// La page s'ouvre dès `canUseAI` (clé API BYOK) ; prompt/modèle restent
// réservés à `canCustomizeAI` — le backend garde le même partage.
const canCustomizeAI = computed(() => {
  const plan = (page.props.currentPlan as PlanTier | undefined) ?? 'starter'
  return PLAN_LIMITS[plan].canCustomizeAI
})

const removingKey = ref(false)

function removeApiKey() {
  if (removingKey.value) return
  router.delete('/settings/ai/api-key', {
    preserveScroll: true,
    onStart: () => {
      removingKey.value = true
    },
    onFinish: () => {
      removingKey.value = false
    },
  })
}

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

    <!-- Clé API Mistral (BYOK) — write-only, jamais réaffichée -->
    <Form
      :action="{ url: '/settings/ai/api-key', method: 'put' }"
      #default="{ processing, errors }"
    >
      <BaseCard class="mb-6">
        <div class="space-y-3">
          <BaseHeading level="3">{{ t('settings.ai.apiKey.label') }}</BaseHeading>
          <p class="text-sm text-fg-muted">{{ t('settings.ai.apiKey.hint') }}</p>
          <p v-if="hasCustomApiKey" class="text-sm font-medium text-success">
            {{ t('settings.ai.apiKey.configured') }}
          </p>
          <BaseInput
            name="aiApiKey"
            type="password"
            :placeholder="
              hasCustomApiKey
                ? t('settings.ai.apiKey.placeholderSet')
                : t('settings.ai.apiKey.placeholder')
            "
            :errors="errors"
          />
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <BaseButton
              v-if="hasCustomApiKey"
              type="button"
              variant="outline"
              :disabled="removingKey"
              @click="removeApiKey"
            >
              {{ t('settings.ai.apiKey.remove') }}
            </BaseButton>
            <BaseButton type="submit" variant="primary" :disabled="processing">
              {{ t('settings.ai.apiKey.save') }}
            </BaseButton>
          </div>
        </template>
      </BaseCard>
    </Form>

    <!-- Personnalisation (prompt + modèle) — enterprise uniquement -->
    <Form
      v-if="canCustomizeAI"
      :action="{ url: '/settings/ai', method: 'put' }"
      #default="{ processing, errors }"
    >
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
