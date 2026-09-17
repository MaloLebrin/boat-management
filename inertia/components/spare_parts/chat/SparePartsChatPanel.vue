<script setup lang="ts">
import { computed } from 'vue'
import { Link } from '@adonisjs/inertia/vue'
import BaseButton from '~/components/base/BaseButton.vue'
import SparePartsChatComposer from '~/components/spare_parts/chat/SparePartsChatComposer.vue'
import SparePartsChatMessage from '~/components/spare_parts/chat/SparePartsChatMessage.vue'
import SparePartsChatResultCard from '~/components/spare_parts/chat/SparePartsChatResultCard.vue'
import type { PartSearchConversationProps } from '#shared/types/spare_part_chat'
import type { SparePartsEngineProps } from '#shared/types/spare_parts'
import { useT } from '~/composables/use_t'
import { useChatConversation } from '~/composables/use_chat_conversation'

/**
 * Panneau du chat de recherche de références (#634) — décalqué de
 * `DiagnosisChatPanel` (#602) : bulle optimiste pendant l'appel Mistral
 * synchrone, rechargement partiel via `only`, redémarrage local.
 */
const props = defineProps<{
  boatId: number
  engine: SparePartsEngineProps
  conversation: PartSearchConversationProps | null
  canManage: boolean
}>()

const { t } = useT()

/** Racine des références du moteur : le repli manuel et le chat en dérivent. */
const sparePartsUrl = computed(
  () => `/boats/${props.boatId}/engines/${props.engine.id}/spare-parts`
)
const conversationsUrl = computed(() => `${sparePartsUrl.value}/chat/conversations`)

const { processing, pendingMessage, showThread, composerMode, submit, startNew } =
  useChatConversation<PartSearchConversationProps, { message: string }>({
    conversation: () => props.conversation,
    startUrl: () => conversationsUrl.value,
    replyUrl: (conversation) => `${conversationsUrl.value}/${conversation.token}/messages`,
    only: ['conversation', 'errors', 'flash'],
  })

/** Le composer émet le texte seul ; la charge utile de l'API est `{ message }`. */
function submitMessage(message: string) {
  submit({ message })
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <p v-if="!showThread" class="text-sm text-fg-muted">{{ t('parts.ai.intro') }}</p>

    <div v-if="showThread && conversation" class="flex flex-col gap-3">
      <SparePartsChatMessage
        v-for="(message, idx) in conversation.messages"
        :key="idx"
        :message="message"
      />
    </div>

    <SparePartsChatMessage
      v-if="pendingMessage !== null"
      :message="{ role: 'user', content: pendingMessage }"
    />
    <p v-if="processing" class="flex items-center gap-2 text-sm italic text-fg-muted">
      <span class="h-2 w-2 animate-pulse rounded-full bg-brand" aria-hidden="true" />
      {{ t('parts.ai.thinking') }}
    </p>

    <!-- Échec d'identification : repli statique, jamais délégué au LLM -->
    <div
      v-if="showThread && conversation?.identificationFailed"
      class="rounded-lg border border-border bg-surface-muted/30 p-3"
    >
      <p class="text-sm font-semibold text-fg">{{ t('parts.ai.identificationFailedTitle') }}</p>
      <p class="mt-1 text-sm text-fg-muted">{{ t('parts.ai.identificationFailedText') }}</p>
      <Link
        :href="sparePartsUrl"
        class="mt-2 inline-block text-sm font-medium text-brand hover:underline"
      >
        {{ t('parts.ai.manualFallbackCta') }}
      </Link>
    </div>

    <SparePartsChatResultCard
      v-if="showThread && conversation?.result"
      :boat-id="boatId"
      :engine="engine"
      :result="conversation.result"
      :can-manage="canManage"
    />

    <SparePartsChatComposer
      v-if="composerMode !== null"
      :mode="composerMode"
      :processing="processing"
      @submit="submitMessage"
    />

    <div v-if="showThread && conversation?.status === 'completed'" class="flex justify-center">
      <BaseButton variant="outline" @click="startNew">
        {{ t('parts.ai.newSearch') }}
      </BaseButton>
    </div>

    <!-- Disclaimer statique : jamais délégué à la génération IA -->
    <p class="text-xs text-fg-subtle">{{ t('parts.ai.disclaimer') }}</p>
  </div>
</template>
