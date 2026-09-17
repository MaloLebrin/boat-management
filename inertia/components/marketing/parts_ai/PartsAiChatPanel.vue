<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import { useChatConversation } from '~/composables/use_chat_conversation'
import BaseButton from '~/components/base/BaseButton.vue'
import PartsAiChatComposer from '~/components/marketing/parts_ai/PartsAiChatComposer.vue'
import PartsAiChatMessage from '~/components/marketing/parts_ai/PartsAiChatMessage.vue'
import PartsAiQuotaBanner from '~/components/marketing/parts_ai/PartsAiQuotaBanner.vue'
import PartsAiResultCard from '~/components/marketing/parts_ai/PartsAiResultCard.vue'
import type {
  PublicPartSearchConversationProps,
  PublicPartSearchQuotaProps,
  PublicPartSearchStartInput,
} from '#shared/types/spare_part_chat'

/**
 * Panneau du chat public de recherche de références (#634 Phase 2), décalqué
 * de `DiagnosisChatPanel` : bulle optimiste pendant l'appel Mistral synchrone,
 * encart statique d'échec d'identification (jamais un texte LLM), résultat et
 * repli honnêtes.
 */
const props = defineProps<{
  conversation: PublicPartSearchConversationProps | null
  quota: PublicPartSearchQuotaProps
  isAuthenticated: boolean
}>()

const { t } = useT()

const exhausted = computed(
  () => props.quota.limit !== null && props.quota.used >= props.quota.limit
)

const { processing, pendingMessage, showThread, composerMode, submit, startNew } =
  useChatConversation<PublicPartSearchConversationProps, PublicPartSearchStartInput>({
    conversation: () => props.conversation,
    startUrl: () => '/parts-ai/conversations',
    replyUrl: (conversation) => `/parts-ai/conversations/${conversation.token}/messages`,
    only: ['conversation', 'quota', 'errors', 'flash'],
    canStart: () => !exhausted.value,
  })
</script>

<template>
  <div class="flex flex-col gap-5">
    <PartsAiQuotaBanner :quota="quota" :is-authenticated="isAuthenticated" />

    <div v-if="showThread && conversation" class="flex flex-col gap-3">
      <PartsAiChatMessage
        v-for="(message, idx) in conversation.messages"
        :key="idx"
        :message="message"
      />
    </div>

    <PartsAiChatMessage
      v-if="pendingMessage !== null"
      :message="{ role: 'user', content: pendingMessage }"
    />
    <p v-if="processing" class="flex items-center gap-2 text-sm italic text-fg-muted">
      <span class="h-2 w-2 animate-pulse rounded-full bg-brand" aria-hidden="true" />
      {{ t('publicPartSearch.composer_thinking') }}
    </p>

    <!-- Échec d'identification : texte statique décidé par le backend, jamais le LLM. -->
    <div
      v-if="showThread && conversation?.identificationFailed && !conversation.result"
      class="rounded-xl border border-border bg-surface-muted/40 p-4"
    >
      <p class="text-sm font-semibold text-fg">
        {{ t('publicPartSearch.identification_failed_title') }}
      </p>
      <p class="mt-1 text-sm text-fg-muted">
        {{ t('publicPartSearch.identification_failed_text') }}
      </p>
    </div>

    <PartsAiResultCard
      v-if="showThread && conversation?.result"
      :result="conversation.result"
      :engine="conversation.engine"
      :is-authenticated="isAuthenticated"
    />

    <PartsAiChatComposer
      v-if="composerMode !== null"
      :mode="composerMode"
      :processing="processing"
      @submit="submit"
    />

    <div
      v-if="showThread && conversation?.status === 'completed' && !exhausted"
      class="flex justify-center"
    >
      <BaseButton variant="outline" @click="startNew">
        {{ t('publicPartSearch.new_conversation') }}
      </BaseButton>
    </div>
  </div>
</template>
