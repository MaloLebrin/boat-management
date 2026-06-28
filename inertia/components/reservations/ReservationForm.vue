<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseField from '~/components/base/BaseField.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/use_t'
import type { ReservationStatus } from '~/types/reservation'

const props = defineProps<{
  boatId: number
}>()

const { t } = useT()

const form = useForm({
  startsAt: '',
  endsAt: '',
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  status: 'option' as ReservationStatus,
  notes: '',
  totalPrice: '',
})

const statusOptions = [
  { value: 'option', label: t('reservations.status.option') },
  { value: 'confirmed', label: t('reservations.status.confirmed') },
  { value: 'cancelled', label: t('reservations.status.cancelled') },
]

function submit() {
  form.post(`/boats/${props.boatId}/reservations`, {
    preserveScroll: true,
    onSuccess: () => form.reset(),
  })
}
</script>

<template>
  <BaseCard>
    <template #header>
      <div class="flex items-center gap-2">
        <svg class="h-4 w-4 text-fg-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        <h2 class="text-sm font-semibold text-fg">{{ t('reservations.form.createTitle') }}</h2>
      </div>
    </template>

    <form class="space-y-4" @submit.prevent="submit">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseField :label="t('reservations.form.startsAt')" :error="form.errors.startsAt">
          <BaseInput v-model="form.startsAt" type="datetime-local" required />
        </BaseField>
        <BaseField :label="t('reservations.form.endsAt')" :error="form.errors.endsAt">
          <BaseInput v-model="form.endsAt" type="datetime-local" required />
        </BaseField>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseField :label="t('reservations.form.clientName')" :error="form.errors.clientName">
          <BaseInput v-model="form.clientName" required />
        </BaseField>
        <BaseField :label="t('reservations.form.status')" :error="form.errors.status">
          <BaseSelect v-model="form.status" :options="statusOptions" />
        </BaseField>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseField :label="t('reservations.form.clientEmail')" :error="form.errors.clientEmail">
          <BaseInput v-model="form.clientEmail" type="email" />
        </BaseField>
        <BaseField :label="t('reservations.form.clientPhone')" :error="form.errors.clientPhone">
          <BaseInput v-model="form.clientPhone" type="tel" />
        </BaseField>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseField :label="t('reservations.form.totalPrice')" :error="form.errors.totalPrice">
          <BaseInput v-model="form.totalPrice" type="number" min="0" step="0.01" />
        </BaseField>
      </div>

      <BaseField :label="t('reservations.form.notes')" :error="form.errors.notes">
        <BaseTextarea v-model="form.notes" :rows="3" />
      </BaseField>

      <div class="flex justify-end">
        <BaseButton type="submit" :disabled="form.processing">
          {{ t('reservations.form.submit') }}
        </BaseButton>
      </div>
    </form>
  </BaseCard>
</template>
