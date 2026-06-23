<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'
import type { CrewMemberRow } from '../../../shared/types/crew'

const props = defineProps<{
  member?: CrewMemberRow
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useT()

const isEdit = Boolean(props.member)

const form = useForm({
  firstName: props.member?.firstName ?? '',
  lastName: props.member?.lastName ?? '',
  email: props.member?.email ?? '',
  phone: props.member?.phone ?? '',
  notes: props.member?.notes ?? '',
})

function submit() {
  if (isEdit) {
    form.put(`/crew/${props.member!.id}`, {
      preserveScroll: true,
      onSuccess: () => emit('close'),
    })
  } else {
    form.post('/crew', {
      preserveScroll: true,
      onSuccess: () => {
        form.reset()
        emit('close')
      },
    })
  }
}
</script>

<template>
  <form
    class="space-y-4 rounded-lg border border-border bg-surface-elevated p-4"
    @submit.prevent="submit"
  >
    <p class="text-sm font-semibold text-fg">
      {{ isEdit ? t('crew.form.editTitle') : t('crew.form.createTitle') }}
    </p>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BaseInput
        v-model="form.firstName"
        :label="t('crew.fields.firstName')"
        :errors="form.errors"
        error-key="firstName"
        name="firstName"
        required
      />
      <BaseInput
        v-model="form.lastName"
        :label="t('crew.fields.lastName')"
        :errors="form.errors"
        error-key="lastName"
        name="lastName"
        required
      />
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BaseInput
        v-model="form.email"
        :label="t('crew.fields.email')"
        :errors="form.errors"
        error-key="email"
        name="email"
        type="email"
      />
      <BaseInput
        v-model="form.phone"
        :label="t('crew.fields.phone')"
        :errors="form.errors"
        error-key="phone"
        name="phone"
      />
    </div>

    <BaseTextarea
      v-model="form.notes"
      :label="t('crew.fields.notes')"
      :errors="form.errors"
      error-key="notes"
      name="notes"
      :rows="2"
    />

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
