<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import { useT } from '~/composables/use_t'
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

const processing = ref(false)
/** Message affiché en optimiste pendant l'appel Mistral synchrone. */
const pendingMessage = ref<string | null>(null)
/** Après un diagnostic terminé, repasse le composer en mode « nouvelle conversation ». */
const startingNew = ref(false)

const exhausted = computed(
  () => props.quota.limit !== null && props.quota.used >= props.quota.limit
)

const showThread = computed(() => props.conversation !== null && !startingNew.value)

const composerMode = computed<'start' | 'reply' | null>(() => {
  if (props.conversation === null || startingNew.value) {
    return exhausted.value ? null : 'start'
  }
  return props.conversation.status === 'active' ? 'reply' : null
})

function submit(payload: PublicDiagnosisStartInput) {
  const isStart = composerMode.value === 'start'
  const url = isStart
    ? '/diagnosis-ai/conversations'
    : `/diagnosis-ai/conversations/${props.conversation!.token}/messages`
  const data = isStart ? { ...payload } : { message: payload.message }

  pendingMessage.value = payload.message
  router.post(url, data, {
    preserveScroll: true,
    only: ['conversation', 'quota', 'errors', 'flash'],
    onStart: () => {
      processing.value = true
    },
    onFinish: () => {
      processing.value = false
      pendingMessage.value = null
      startingNew.value = false
    },
  })
}
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
      <BaseButton variant="outline" @click="startingNew = true">
        {{ t('publicDiagnosis.new_conversation') }}
      </BaseButton>
    </div>
  </div>
</template>
