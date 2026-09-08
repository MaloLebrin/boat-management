<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import AssistantActionCard from '~/components/assistant/AssistantActionCard.vue'
import AssistantMessage from '~/components/assistant/AssistantMessage.vue'
import { useT } from '~/composables/use_t'
import type { AssistantConversationProps, AssistantStarterProps } from '#shared/types/assistant'

/** Fil du copilote : messages, bulle optimiste, carte d'action en attente. */
const props = defineProps<{
  conversation: AssistantConversationProps | null
  pendingMessage: string | null
  processing: boolean
  starters?: AssistantStarterProps[]
}>()

/** Clic sur une suggestion : le libellé RENDU (locale de l'utilisateur) part comme message. */
const emit = defineEmits<{ starter: [message: string] }>()

const { t } = useT()

const scrollArea = ref<HTMLElement | null>(null)

watch(
  () => [
    props.conversation?.messages.length ?? 0,
    props.pendingMessage,
    props.processing,
    props.conversation?.pendingAction,
  ],
  async () => {
    await nextTick()
    scrollArea.value?.scrollTo({ top: scrollArea.value.scrollHeight })
  },
  { deep: false }
)
</script>

<template>
  <div ref="scrollArea" class="flex-1 overflow-y-auto px-4 py-4">
    <div class="flex flex-col gap-3">
      <p v-if="conversation === null && pendingMessage === null" class="text-sm text-navy-200">
        {{ t('assistant.intro') }}
      </p>

      <!-- Suggestions de démarrage : fil vide uniquement, texte 100 % i18n -->
      <div
        v-if="conversation === null && pendingMessage === null && (starters?.length ?? 0) > 0"
        class="flex flex-wrap gap-2"
      >
        <button
          v-for="starter in starters"
          :key="starter.id"
          type="button"
          class="rounded-full border border-navy-600 bg-white/5 px-3 py-1.5 text-left text-xs text-navy-100 transition-colors hover:bg-navy-700"
          @click="emit('starter', t(starter.i18nKey, starter.params))"
        >
          {{ t(starter.i18nKey, starter.params) }}
        </button>
      </div>

      <AssistantMessage
        v-for="(message, idx) in conversation?.messages ?? []"
        :key="idx"
        :message="message"
      />

      <AssistantMessage
        v-if="pendingMessage !== null"
        :message="{ role: 'user', content: pendingMessage }"
      />

      <p v-if="processing" class="flex items-center gap-2 text-sm italic text-navy-200">
        <span class="h-2 w-2 animate-pulse rounded-full bg-lilac-300" aria-hidden="true" />
        {{ t('assistant.thinking') }}
      </p>

      <AssistantActionCard
        v-if="conversation?.pendingAction"
        :token="conversation.token"
        :proposal="conversation.pendingAction"
      />
    </div>
  </div>
</template>
