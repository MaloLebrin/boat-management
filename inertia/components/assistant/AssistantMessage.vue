<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { computed } from 'vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { AssistantMessage as AssistantMessageType } from '#shared/types/assistant'

/**
 * Bulle du copilote FleetAi, posée sur le panneau navy permanent. Les cartes
 * (`task_created`, `task_dismissed`, `handoff`) sont rendues via i18n — leur
 * texte n'est jamais généré par le LLM.
 */
const props = defineProps<{ message: AssistantMessageType }>()

const { t } = useT()
const { formatDate } = useDateFormat()

const card = computed(() => props.message.card ?? null)

const handoffHref = computed(() => {
  if (card.value?.kind !== 'handoff') return null
  const base = `/boats/${card.value.boatId}/engines/${card.value.engineId}`
  return card.value.target === 'diagnosis' ? `${base}/diagnostic` : `${base}/spare-parts/chat`
})

const taskCreatedDue = computed(() => {
  if (card.value?.kind !== 'task_created') return null
  if (card.value.dueAt !== null) return formatDate(card.value.dueAt)
  if (card.value.dueEngineHours !== null) {
    return t('assistant.taskCreated.dueHours', { hours: String(card.value.dueEngineHours) })
  }
  return null
})
</script>

<template>
  <div
    v-if="message.content"
    :class="['flex', message.role === 'user' ? 'justify-end' : 'justify-start']"
  >
    <div
      :class="[
        'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        message.role === 'user'
          ? 'rounded-br-md bg-violet-600/40 text-white'
          : 'rounded-bl-md bg-white/10 text-navy-100',
      ]"
    >
      <p class="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
        {{ message.role === 'user' ? t('assistant.chatYou') : t('assistant.chatAssistant') }}
      </p>
      <p class="whitespace-pre-line">{{ message.content }}</p>
    </div>
  </div>

  <!-- Carte « tâche créée » -->
  <div
    v-if="card?.kind === 'task_created'"
    class="rounded-xl border border-mint-500/40 bg-mint-500/10 px-4 py-3"
  >
    <p class="flex items-center gap-2 text-sm font-semibold text-white">
      <svg class="h-4 w-4 text-mint-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      {{ t('assistant.taskCreated.title', { boat: card.boatName }) }}
    </p>
    <p class="mt-1 text-sm text-navy-100">{{ card.title }}</p>
    <p v-if="taskCreatedDue" class="mt-0.5 text-xs text-navy-300">{{ taskCreatedDue }}</p>
    <Link
      href="/planning"
      class="mt-2 inline-block text-xs font-medium text-lilac-300 hover:underline"
    >
      {{ t('assistant.taskCreated.viewPlanning') }}
    </Link>
  </div>

  <!-- Proposition refusée -->
  <p v-else-if="card?.kind === 'task_dismissed'" class="text-xs italic text-navy-400">
    {{ t('assistant.taskDismissed') }}
  </p>

  <!-- Handoff vers le diagnostic ou la recherche de pièces -->
  <div v-else-if="card?.kind === 'handoff' && handoffHref" class="flex justify-start">
    <Link
      :href="handoffHref"
      class="inline-flex items-center gap-2 rounded-lg bg-violet-600/40 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-violet-600/60"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 7l5 5m0 0l-5 5m5-5H6"
        />
      </svg>
      {{
        card.target === 'diagnosis'
          ? t('assistant.handoff.diagnosis', { engine: card.engineLabel, boat: card.boatName })
          : t('assistant.handoff.partSearch', { engine: card.engineLabel, boat: card.boatName })
      }}
    </Link>
  </div>
</template>
