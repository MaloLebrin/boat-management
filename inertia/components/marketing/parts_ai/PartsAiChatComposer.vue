<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { useT } from '~/composables/use_t'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { PART_SEARCH_MESSAGE_MAX_LENGTH } from '#shared/types/spare_part_chat'
import type { PublicPartSearchStartInput } from '#shared/types/spare_part_chat'

const props = defineProps<{
  /** `start` affiche les champs marque + numéro de série du 1er message. */
  mode: 'start' | 'reply'
  processing: boolean
}>()

const emit = defineEmits<{ (e: 'submit', payload: PublicPartSearchStartInput): void }>()

const { t } = useT()
const page = usePage<{ errors?: Record<string, string> }>()

const message = ref('')
const brand = ref('')
const serialNumber = ref('')

const messageError = computed(() => page.props.errors?.message)
const canSubmit = computed(() => message.value.trim().length > 0 && !props.processing)

function submit() {
  if (!canSubmit.value) return
  emit('submit', {
    message: message.value.trim(),
    brand: props.mode === 'start' && brand.value.trim() ? brand.value.trim() : null,
    serialNumber:
      props.mode === 'start' && serialNumber.value.trim() ? serialNumber.value.trim() : null,
  })
  message.value = ''
}
</script>

<template>
  <form class="flex flex-col gap-3" @submit.prevent="submit">
    <fieldset v-if="mode === 'start'" class="rounded-xl border border-border p-4">
      <legend class="px-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {{ t('publicPartSearch.context_title') }}
      </legend>
      <div class="grid gap-3 sm:grid-cols-2">
        <BaseInput
          v-model="brand"
          name="brand"
          :label="t('publicPartSearch.context_brand')"
          :placeholder="t('publicPartSearch.context_brand_placeholder')"
          :error="page.props.errors?.brand"
        />
        <BaseInput
          v-model="serialNumber"
          name="serialNumber"
          :label="t('publicPartSearch.context_serial')"
          :placeholder="t('publicPartSearch.context_serial_placeholder')"
          :error="page.props.errors?.serialNumber"
        />
      </div>
    </fieldset>

    <div>
      <textarea
        v-model="message"
        name="message"
        rows="3"
        :maxlength="PART_SEARCH_MESSAGE_MAX_LENGTH"
        :placeholder="t('publicPartSearch.composer_placeholder')"
        :disabled="processing"
        class="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
      />
      <p v-if="messageError" class="mt-1 text-xs text-danger">{{ messageError }}</p>
    </div>

    <div class="flex items-center justify-end">
      <BaseButton type="submit" variant="primary" :disabled="!canSubmit">
        {{
          mode === 'start'
            ? t('publicPartSearch.composer_start')
            : t('publicPartSearch.composer_send')
        }}
      </BaseButton>
    </div>
  </form>
</template>
