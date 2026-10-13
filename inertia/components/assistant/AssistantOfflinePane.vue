<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import AssistantComposer from '~/components/assistant/AssistantComposer.vue'
import AssistantMessage from '~/components/assistant/AssistantMessage.vue'
import { useAssistantOffline } from '~/composables/use_assistant_offline'
import { useAssistantPanel } from '~/composables/use_assistant_panel'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'

/**
 * Le copilote sans réseau (#971) : l'aide produit répond localement, les
 * questions qui demandent le modèle attendent le retour du réseau. Même
 * surface navy permanente que le panneau (exception CLAUDE.md).
 */
const { t } = useT()
const { formatDateTime } = useDateFormat()
const { canUseAI } = useAssistantPanel()
const { entries, pendingQuestions, ask, askLater, removePending } = useAssistantOffline()

const processing = ref(false)
const scrollArea = ref<HTMLElement | null>(null)

async function submit(message: string) {
  processing.value = true
  try {
    await ask(message)
  } finally {
    processing.value = false
  }
}

watch(
  () => entries.value.length,
  async () => {
    await nextTick()
    scrollArea.value?.scrollTo?.({ top: scrollArea.value.scrollHeight })
  }
)
</script>

<template>
  <div
    role="status"
    class="shrink-0 border-b border-navy-700 bg-white/5 px-4 py-2 text-xs text-amber-400"
    data-testid="assistant-offline-banner"
  >
    {{ t('assistant.offline.banner') }}
  </div>

  <div ref="scrollArea" class="flex-1 overflow-y-auto px-4 py-4">
    <div class="flex flex-col gap-3">
      <p v-if="entries.length === 0" class="text-sm text-navy-200">
        {{ canUseAI ? t('assistant.offline.intro') : t('assistant.offline.introHelpOnly') }}
      </p>

      <template v-for="entry in entries" :key="entry.id">
        <AssistantMessage :message="entry.message" />
        <button
          v-if="entry.askLater"
          type="button"
          class="self-start rounded-full border border-navy-600 bg-white/5 px-3 py-1.5 text-xs text-navy-100 transition-colors hover:bg-navy-700"
          data-testid="assistant-ask-later"
          @click="askLater(entry)"
        >
          {{ t('assistant.offline.askLater') }}
        </button>
      </template>
    </div>
  </div>

  <div
    class="shrink-0 border-t border-navy-700 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:pb-3"
  >
    <section
      v-if="pendingQuestions.length > 0"
      class="mb-3"
      :aria-label="t('assistant.offline.pendingTitle', { count: String(pendingQuestions.length) })"
    >
      <p class="mb-1 text-xs font-semibold text-navy-200">
        {{ t('assistant.offline.pendingTitle', { count: String(pendingQuestions.length) }) }}
      </p>
      <ul class="space-y-1">
        <li
          v-for="question in pendingQuestions"
          :key="question.id"
          class="flex items-start justify-between gap-2 text-xs text-navy-300"
          data-testid="assistant-pending-question"
        >
          <span class="min-w-0 break-words">
            {{ question.message }}
            <span class="text-navy-400">· {{ formatDateTime(question.askedAt) }}</span>
          </span>
          <button
            type="button"
            class="shrink-0 text-lilac-300 hover:underline"
            :aria-label="t('assistant.offline.removeAriaLabel', { question: question.message })"
            @click="removePending(question.id)"
          >
            {{ t('assistant.offline.remove') }}
          </button>
        </li>
      </ul>
    </section>
    <AssistantComposer mode="reply" :processing="processing" :disabled="false" @submit="submit" />
  </div>
</template>
