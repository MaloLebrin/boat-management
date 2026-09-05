<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AssistantComposer from '~/components/assistant/AssistantComposer.vue'
import AssistantThread from '~/components/assistant/AssistantThread.vue'
import AssistantUpsell from '~/components/assistant/AssistantUpsell.vue'
import { useAssistantPanel } from '~/composables/use_assistant_panel'
import { useT } from '~/composables/use_t'
import { ASSISTANT_MAX_USER_MESSAGES } from '#shared/types/assistant'

/**
 * Panneau du copilote FleetAi — rail droit sur desktop, drawer plein écran sur
 * mobile (même nœud, styles responsive). Surface navy permanente : exception
 * documentée dans CLAUDE.md, comme la sidebar et `DashboardAiPanel`.
 */
const { t } = useT()
const { conversation, canUseAI, close, ensureLoaded } = useAssistantPanel()

const processing = ref(false)
/** Message affiché en optimiste pendant l'appel Mistral synchrone. */
const pendingMessage = ref<string | null>(null)

const maxMessagesReached = computed(
  () =>
    conversation.value !== null &&
    conversation.value.userMessagesCount >= ASSISTANT_MAX_USER_MESSAGES
)

const composerDisabled = computed(
  () => processing.value || conversation.value?.pendingAction != null
)

const showComposer = computed(() => !maxMessagesReached.value)

function submit(message: string) {
  const url = conversation.value
    ? `/assistant/conversations/${conversation.value.token}/messages`
    : '/assistant/conversations'

  pendingMessage.value = message
  router.post(
    url,
    { message },
    {
      preserveScroll: true,
      preserveState: true,
      only: ['assistantConversation', 'errors', 'flash'],
      onStart: () => {
        processing.value = true
      },
      onFinish: () => {
        processing.value = false
        pendingMessage.value = null
      },
    }
  )
}

function startNewConversation() {
  if (conversation.value === null || processing.value) return
  router.post(
    `/assistant/conversations/${conversation.value.token}/archive`,
    {},
    {
      preserveScroll: true,
      preserveState: true,
      only: ['assistantConversation', 'errors', 'flash'],
    }
  )
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  ensureLoaded()
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <!-- Backdrop mobile : le panneau se comporte en drawer sous lg -->
  <button
    type="button"
    class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
    :aria-label="t('assistant.close')"
    @click="close"
  />
  <aside
    role="dialog"
    aria-modal="false"
    :aria-label="t('assistant.subtitle')"
    class="fixed inset-y-0 right-0 z-50 flex h-dvh w-full max-w-md flex-col bg-navy-900 text-white shadow-2xl lg:static lg:z-auto lg:h-full lg:w-96 lg:max-w-none lg:shrink-0 lg:border-l lg:border-navy-700 lg:shadow-none"
  >
    <!-- Header -->
    <div
      class="shrink-0 border-b border-navy-700 px-4 py-4 pt-[calc(env(safe-area-inset-top)+1rem)] lg:pt-4"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="text-lilac-300" aria-hidden="true">&#10022;</span>
          <div class="leading-tight">
            <p class="font-display text-sm font-semibold text-white">
              Fleet<em class="text-coral-500">Ai</em>
            </p>
            <p class="text-xs text-navy-300">{{ t('assistant.subtitle') }}</p>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <button
            v-if="conversation !== null"
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-100 transition-colors hover:bg-navy-700 hover:text-white"
            :aria-label="t('assistant.newConversation')"
            :title="t('assistant.newConversation')"
            :disabled="processing"
            @click="startNewConversation"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-100 transition-colors hover:bg-navy-700 hover:text-white"
            :aria-label="t('assistant.close')"
            @click="close"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Plan starter : upsell, pas de chat -->
    <AssistantUpsell v-if="!canUseAI" />

    <template v-else>
      <AssistantThread
        :conversation="conversation"
        :pending-message="pendingMessage"
        :processing="processing"
      />

      <div
        class="shrink-0 border-t border-navy-700 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:pb-3"
      >
        <p v-if="maxMessagesReached" class="mb-2 text-xs text-navy-300">
          {{ t('assistant.maxMessages') }}
        </p>
        <AssistantComposer
          v-if="showComposer"
          :mode="conversation === null ? 'start' : 'reply'"
          :processing="processing"
          :disabled="composerDisabled"
          @submit="submit"
        />
        <p class="mt-2 text-[11px] leading-snug text-navy-400">{{ t('assistant.disclaimer') }}</p>
      </div>
    </template>
  </aside>
</template>
