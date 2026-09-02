<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { useT } from '~/composables/use_t'
import BaseButton from '~/components/base/BaseButton.vue'
import { PART_SEARCH_MESSAGE_MAX_LENGTH } from '#shared/types/spare_part_chat'

const props = defineProps<{
  mode: 'start' | 'reply'
  processing: boolean
}>()

const emit = defineEmits<{ (e: 'submit', message: string): void }>()

const { t } = useT()
const page = usePage<{ errors?: Record<string, string> }>()

const message = ref('')

const messageError = computed(() => page.props.errors?.message)
const canSubmit = computed(() => message.value.trim().length > 0 && !props.processing)

function submit() {
  if (!canSubmit.value) return
  emit('submit', message.value.trim())
  message.value = ''
}
</script>

<template>
  <form class="flex flex-col gap-3" @submit.prevent="submit">
    <div>
      <textarea
        v-model="message"
        name="message"
        rows="3"
        :maxlength="PART_SEARCH_MESSAGE_MAX_LENGTH"
        :placeholder="t('parts.ai.composerPlaceholder')"
        :disabled="processing"
        class="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
      />
      <p v-if="messageError" class="mt-1 text-xs text-danger">{{ messageError }}</p>
    </div>

    <div class="flex items-center justify-end">
      <BaseButton type="submit" variant="primary" :disabled="!canSubmit">
        {{ mode === 'start' ? t('parts.ai.composerStart') : t('parts.ai.composerSend') }}
      </BaseButton>
    </div>
  </form>
</template>
