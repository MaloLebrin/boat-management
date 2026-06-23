<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  memberId: number
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useT()

const certTypeOptions = computed(() => [
  { label: t('crew.certTypes.coastal_permit'), value: 'coastal_permit' },
  { label: t('crew.certTypes.offshore_permit'), value: 'offshore_permit' },
  { label: t('crew.certTypes.vhf'), value: 'vhf' },
  { label: t('crew.certTypes.stcw_basic'), value: 'stcw_basic' },
  { label: t('crew.certTypes.stcw_proficiency'), value: 'stcw_proficiency' },
  { label: t('crew.certTypes.other'), value: 'other' },
])

const form = useForm({
  type: '' as string,
  referenceNumber: '',
  expiresAt: '',
})

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
      :options="certTypeOptions"
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
