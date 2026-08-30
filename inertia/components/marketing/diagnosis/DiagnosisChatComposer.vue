<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { useT } from '~/composables/use_t'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { PUBLIC_DIAGNOSIS_MESSAGE_MAX_LENGTH } from '#shared/types/public_diagnosis'
import type { PublicDiagnosisStartInput } from '#shared/types/public_diagnosis'

const props = defineProps<{
  /** `start` affiche les champs de contexte moteur du 1er message. */
  mode: 'start' | 'reply'
  processing: boolean
}>()

const emit = defineEmits<{ (e: 'submit', payload: PublicDiagnosisStartInput): void }>()

const { t } = useT()
const page = usePage<{ errors?: Record<string, string> }>()

const message = ref('')
const engineType = ref('')
const brand = ref('')
const hours = ref('')

const messageError = computed(() => page.props.errors?.message)
const canSubmit = computed(() => message.value.trim().length > 0 && !props.processing)

function submit() {
  if (!canSubmit.value) return
  emit('submit', {
    message: message.value.trim(),
    engineType: props.mode === 'start' && engineType.value.trim() ? engineType.value.trim() : null,
    brand: props.mode === 'start' && brand.value.trim() ? brand.value.trim() : null,
    hours: props.mode === 'start' && hours.value !== '' ? Number(hours.value) : null,
  })
  message.value = ''
}
</script>

<template>
  <form class="flex flex-col gap-3" @submit.prevent="submit">
    <fieldset v-if="mode === 'start'" class="rounded-xl border border-border p-4">
      <legend class="px-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {{ t('publicDiagnosis.context_title') }}
      </legend>
      <div class="grid gap-3 sm:grid-cols-3">
        <BaseInput
          v-model="engineType"
          name="engineType"
          :label="t('publicDiagnosis.context_engine_type')"
          :placeholder="t('publicDiagnosis.context_engine_type_placeholder')"
          :error="page.props.errors?.engineType"
        />
        <BaseInput
          v-model="brand"
          name="brand"
          :label="t('publicDiagnosis.context_brand')"
          :placeholder="t('publicDiagnosis.context_brand_placeholder')"
          :error="page.props.errors?.brand"
        />
        <BaseInput
          v-model="hours"
          name="hours"
          type="number"
          min="0"
          :label="t('publicDiagnosis.context_hours')"
          :error="page.props.errors?.hours"
        />
      </div>
    </fieldset>

    <div>
      <textarea
        v-model="message"
        name="message"
        rows="3"
        :maxlength="PUBLIC_DIAGNOSIS_MESSAGE_MAX_LENGTH"
        :placeholder="t('publicDiagnosis.composer_placeholder')"
        :disabled="processing"
        class="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
      />
      <p v-if="messageError" class="mt-1 text-xs text-danger">{{ messageError }}</p>
    </div>

    <div class="flex items-center justify-end">
      <BaseButton type="submit" variant="primary" :disabled="!canSubmit">
        {{
          mode === 'start'
            ? t('publicDiagnosis.composer_start')
            : t('publicDiagnosis.composer_send')
        }}
      </BaseButton>
    </div>
  </form>
</template>
