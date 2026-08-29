<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useNavigationTitles } from '~/composables/use_navigation_titles'
import { useT } from '~/composables/use_t'
import { suggestedExpiryDate } from '#shared/helpers/navigation_title'
import type { NavigationTitle } from '#shared/types/navigation_title'

const props = defineProps<{
  memberId: number
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useT()
const { certificationTypeOptions } = useNavigationTitles()

const form = useForm({
  type: '' as NavigationTitle | '',
  referenceNumber: '',
  expiresAt: '',
})

/**
 * Dernière date proposée automatiquement (#585). On ne remplace `expiresAt`
 * que s'il est vide ou porte encore une suggestion : une date saisie — ou
 * effacée volontairement, auquel cas elle redevient éligible — reste maîtresse.
 */
const suggestedExpiry = ref<string | null>(null)

watch(
  () => form.type,
  (type) => {
    if (form.expiresAt !== '' && form.expiresAt !== suggestedExpiry.value) return
    const suggestion = suggestedExpiryDate(type)
    suggestedExpiry.value = suggestion
    form.expiresAt = suggestion ?? ''
  }
)

function submit() {
  form.post(`/crew/${props.memberId}/certifications`, {
    preserveScroll: true,
    onSuccess: () => {
      form.reset()
      emit('close')
    },
  })
}
</script>

<template>
  <form
    class="space-y-3 rounded-lg border border-border bg-surface-muted/30 p-4"
    @submit.prevent="submit"
  >
    <p class="text-sm font-semibold text-fg">{{ t('crew.form.certTitle') }}</p>

    <BaseSelect
      v-model="form.type"
      :label="t('crew.fields.certType')"
      :errors="form.errors"
      error-key="type"
      name="type"
      :options="certificationTypeOptions"
      :placeholder="t('navigation_logs.fields.selectSeaState')"
      allow-empty
      required
    />

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <BaseInput
        v-model="form.referenceNumber"
        :label="t('crew.fields.referenceNumber')"
        :errors="form.errors"
        error-key="referenceNumber"
        name="referenceNumber"
      />
      <BaseInput
        v-model="form.expiresAt"
        :label="t('crew.fields.expiresAt')"
        :errors="form.errors"
        error-key="expiresAt"
        name="expiresAt"
        type="date"
        :hint="suggestedExpiry !== null ? t('crew.fields.expiresAtSuggested') : undefined"
      />
    </div>

    <div class="flex justify-end gap-2">
      <BaseButton type="button" variant="ghost" size="sm" @click="emit('close')">
        {{ t('crew.form.cancel') }}
      </BaseButton>
      <BaseButton type="submit" variant="primary" size="sm" :disabled="form.processing">
        {{ t('crew.form.submit') }}
      </BaseButton>
    </div>
  </form>
</template>
