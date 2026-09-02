<script setup lang="ts">
import { useT } from '~/composables/use_t'
import type { AiChatMessage } from '#shared/types/ai'

/**
 * Bulle du chat de recherche de références (#634). Jumelle de
 * `DiagnosisChatMessage` (#602), mais avec les libellés du namespace `parts` :
 * l'app connectée vouvoie, le marketing tutoie — les clés ne sont pas
 * partageables.
 */
defineProps<{ message: AiChatMessage }>()

const { t } = useT()
</script>

<template>
  <div :class="['flex', message.role === 'user' ? 'justify-end' : 'justify-start']">
    <div
      :class="[
        'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        message.role === 'user'
          ? 'rounded-br-md bg-brand text-on-brand'
          : 'rounded-bl-md bg-surface-muted text-fg',
      ]"
    >
      <p class="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
        {{ message.role === 'user' ? t('parts.ai.chatYou') : t('parts.ai.chatAssistant') }}
      </p>
      <p class="whitespace-pre-line">{{ message.content }}</p>
    </div>
  </div>
</template>
