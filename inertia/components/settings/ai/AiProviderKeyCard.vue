<script setup lang="ts">
import { ref } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { AI_PROVIDER_LABELS, type AiProvider } from '#shared/types/ai'
import { useT } from '~/composables/use_t'

const { t } = useT()

const props = defineProps<{
  provider: AiProvider
  configured: boolean
}>()

// Nom de marque du fournisseur — interpolé dans les libellés i18n.
const providerLabel = AI_PROVIDER_LABELS[props.provider]

const removingKey = ref(false)

function removeApiKey() {
  if (removingKey.value) return
  router.delete(`/settings/ai/api-key/${props.provider}`, {
    preserveScroll: true,
    onStart: () => {
      removingKey.value = true
    },
    onFinish: () => {
      removingKey.value = false
    },
  })
}
</script>

<template>
  <!-- Clé write-only : jamais réaffichée, seul le booléen `configured` revient. -->
  <Form
    :action="{ url: `/settings/ai/api-key/${provider}`, method: 'put' }"
    reset-on-success
    #default="{ processing, errors }"
  >
    <BaseCard>
      <div class="space-y-3">
        <BaseHeading level="3">
          {{ t('settings.ai.apiKey.label', { provider: providerLabel }) }}
        </BaseHeading>
        <p v-if="configured" class="text-sm font-medium text-success">
          {{ t('settings.ai.apiKey.configured') }}
        </p>
        <BaseInput
          name="aiApiKey"
          type="password"
          :placeholder="
            configured
              ? t('settings.ai.apiKey.placeholderSet')
              : t('settings.ai.apiKey.placeholder', { provider: providerLabel })
          "
          :errors="errors"
        />
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <BaseButton
            v-if="configured"
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
</template>
