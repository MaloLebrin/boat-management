<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { useT } from '~/composables/use_t'
import { ASSISTANT_MESSAGE_MAX_LENGTH } from '#shared/types/assistant'

/**
 * Composer du copilote — posé sur le panneau navy : styles sombres locaux
 * plutôt que les tokens de surface (surface permanente, cf. CLAUDE.md).
 */
const props = defineProps<{
  mode: 'start' | 'reply'
  processing: boolean
  disabled: boolean
}>()

const emit = defineEmits<{ (e: 'submit', message: string): void }>()

const { t } = useT()
const page = usePage<{ errors?: Record<string, string> }>()

const message = ref('')

const messageError = computed(() => page.props.errors?.message)
const canSubmit = computed(
  () => message.value.trim().length > 0 && !props.processing && !props.disabled
)

function submit() {
  if (!canSubmit.value) return
  emit('submit', message.value.trim())
  message.value = ''
}

function onKeydown(e: KeyboardEvent) {
  // Entrée envoie, Maj+Entrée insère un saut de ligne (usage chat standard).
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}
</script>

<template>
  <form class="flex items-end gap-2" @submit.prevent="submit">
    <div class="flex-1">
      <textarea
        v-model="message"
        name="message"
        rows="2"
        :maxlength="ASSISTANT_MESSAGE_MAX_LENGTH"
        :placeholder="t('assistant.composerPlaceholder')"
        :disabled="processing || disabled"
        class="w-full resize-none rounded-xl border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-white placeholder:text-navy-400 focus:border-lilac-300 focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60"
        @keydown="onKeydown"
      />
      <p v-if="messageError" class="mt-1 text-xs text-coral-400">{{ messageError }}</p>
    </div>
    <button
      type="submit"
      class="mb-1.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
      :disabled="!canSubmit"
      :aria-label="mode === 'start' ? t('assistant.composerStart') : t('assistant.composerSend')"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M14 5l7 7m0 0l-7 7m7-7H3"
        />
      </svg>
    </button>
  </form>
</template>
