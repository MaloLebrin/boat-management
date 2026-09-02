<script setup lang="ts">
import { useT } from '~/composables/use_t'
import type { AiChatMessage } from '#shared/types/ai'

/**
 * Bulle du chat public de recherche de pièces (#634 Phase 2). Même gabarit que
 * `DiagnosisChatMessage` avec ses propres clés : le marketing tutoie, les clés
 * `parts.ai.*` de l'app connectée vouvoient — elles ne sont pas partageables.
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
        {{
          message.role === 'user'
            ? t('publicPartSearch.chat_you')
            : t('publicPartSearch.chat_assistant')
        }}
      </p>
      <p class="whitespace-pre-line">{{ message.content }}</p>
    </div>
  </div>
</template>
