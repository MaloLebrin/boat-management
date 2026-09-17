<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import { useChatConversation } from '~/composables/use_chat_conversation'
import BaseButton from '~/components/base/BaseButton.vue'
import DiagnosisChatComposer from '~/components/marketing/diagnosis/DiagnosisChatComposer.vue'
import DiagnosisChatMessage from '~/components/marketing/diagnosis/DiagnosisChatMessage.vue'
import DiagnosisQuotaBanner from '~/components/marketing/diagnosis/DiagnosisQuotaBanner.vue'
import DiagnosisResultCard from '~/components/marketing/diagnosis/DiagnosisResultCard.vue'
import type {
  PublicDiagnosisConversationProps,
  PublicDiagnosisQuotaProps,
  PublicDiagnosisStartInput,
} from '#shared/types/public_diagnosis'

const props = defineProps<{
  conversation: PublicDiagnosisConversationProps | null
  quota: PublicDiagnosisQuotaProps
  isAuthenticated: boolean
}>()

const { t } = useT()

const exhausted = computed(
  () => props.quota.limit !== null && props.quota.used >= props.quota.limit
)

const { processing, pendingMessage, showThread, composerMode, submit, startNew } =
  useChatConversation<PublicDiagnosisConversationProps, PublicDiagnosisStartInput>({
    conversation: () => props.conversation,
    startUrl: () => '/diagnosis-ai/conversations',
    replyUrl: (conversation) => `/diagnosis-ai/conversations/${conversation.token}/messages`,
    only: ['conversation', 'quota', 'errors', 'flash'],
    canStart: () => !exhausted.value,
  })
</script>

<template>
  <div class="flex flex-col gap-5">
    <DiagnosisQuotaBanner :quota="quota" :is-authenticated="isAuthenticated" />

    <div v-if="showThread && conversation" class="flex flex-col gap-3">
      <DiagnosisChatMessage
        v-for="(message, idx) in conversation.messages"
        :key="idx"
        :message="message"
      />
    </div>

    <DiagnosisChatMessage
      v-if="pendingMessage !== null"
      :message="{ role: 'user', content: pendingMessage }"
    />
    <p v-if="processing" class="flex items-center gap-2 text-sm italic text-fg-muted">
      <span class="h-2 w-2 animate-pulse rounded-full bg-brand" aria-hidden="true" />
      {{ t('publicDiagnosis.composer_thinking') }}
    </p>

    <DiagnosisResultCard
      v-if="showThread && conversation?.result"
      :result="conversation.result"
      :is-authenticated="isAuthenticated"
    />

    <DiagnosisChatComposer
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
        {{ t('publicDiagnosis.new_conversation') }}
      </BaseButton>
    </div>
  </div>
</template>
