<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCheckbox from '~/components/base/BaseCheckbox.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'
import type { ClientRow, ClientPermitType, ClientStatus } from '../../../shared/types/client'

const props = defineProps<{
  client?: ClientRow | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useT()

const isEdit = Boolean(props.client)

const form = useForm({
  firstName: props.client?.firstName ?? '',
  lastName: props.client?.lastName ?? '',
  email: props.client?.email ?? '',
  phone: props.client?.phone ?? '',
  address: props.client?.address ?? '',
  navigationPermitNumber: props.client?.navigationPermitNumber ?? '',
  navigationPermitType: (props.client?.navigationPermitType ?? '') as ClientPermitType | '',
  status: (props.client?.status ?? 'active') as ClientStatus,
  notes: props.client?.notes ?? '',
  gdprConsent: props.client?.gdprConsentAt != null,
})

const permitTypeOptions: Array<{ label: string; value: ClientPermitType }> = [
  { label: t('clients.permitTypes.coastal'), value: 'coastal' },
  { label: t('clients.permitTypes.offshore'), value: 'offshore' },
  { label: t('clients.permitTypes.inland'), value: 'inland' },
  { label: t('clients.permitTypes.other'), value: 'other' },
]

const statusOptions: Array<{ label: string; value: ClientStatus }> = [
  { label: t('clients.status.active'), value: 'active' },
  { label: t('clients.status.inactive'), value: 'inactive' },
  { label: t('clients.status.blacklisted'), value: 'blacklisted' },
]

function submit() {
  if (isEdit) {
    form.put(`/clients/${props.client!.id}`, {
      preserveScroll: true,
      onSuccess: () => emit('close'),
    })
  } else {
    form.post('/clients', {
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
      {{ isEdit ? t('clients.form.editTitle') : t('clients.form.createTitle') }}
    </p>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BaseInput
        v-model="form.firstName"
        :label="t('clients.fields.firstName')"
        :errors="form.errors"
        error-key="firstName"
        name="firstName"
        required
      />
      <BaseInput
        v-model="form.lastName"
        :label="t('clients.fields.lastName')"
        :errors="form.errors"
        error-key="lastName"
        name="lastName"
        required
      />
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BaseInput
        v-model="form.email"
        :label="t('clients.fields.email')"
        :errors="form.errors"
        error-key="email"
        name="email"
        type="email"
      />
      <BaseInput
        v-model="form.phone"
        :label="t('clients.fields.phone')"
        :errors="form.errors"
        error-key="phone"
        name="phone"
      />
    </div>

    <BaseInput
      v-model="form.address"
      :label="t('clients.fields.address')"
      :errors="form.errors"
      error-key="address"
      name="address"
    />

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BaseInput
        v-model="form.navigationPermitNumber"
        :label="t('clients.fields.navigationPermitNumber')"
        :errors="form.errors"
        error-key="navigationPermitNumber"
        name="navigationPermitNumber"
      />
      <BaseSelect
        v-model="form.navigationPermitType"
        :label="t('clients.fields.navigationPermitType')"
        :options="permitTypeOptions"
        :errors="form.errors"
        error-key="navigationPermitType"
        allow-empty
        name="navigationPermitType"
      />
    </div>

    <BaseSelect
      v-model="form.status"
      :label="t('clients.fields.status')"
      :options="statusOptions"
      :errors="form.errors"
      error-key="status"
      name="status"
    />

    <BaseTextarea
      v-model="form.notes"
      :label="t('clients.fields.notes')"
      :errors="form.errors"
      error-key="notes"
      name="notes"
      :rows="2"
    />

    <BaseCheckbox
      v-model="form.gdprConsent"
      :label="t('clients.gdpr.consentLabel')"
      :hint="t('clients.gdpr.consentHint')"
      name="gdprConsent"
    />

    <div class="flex justify-end gap-2">
      <BaseButton type="button" variant="ghost" size="sm" @click="emit('close')">
        {{ t('clients.form.cancel') }}
      </BaseButton>
      <BaseButton type="submit" variant="primary" size="sm" :disabled="form.processing">
        {{ t('clients.form.submit') }}
      </BaseButton>
    </div>
  </form>
</template>
