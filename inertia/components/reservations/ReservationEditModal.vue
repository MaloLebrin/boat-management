<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { computed, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseField from '~/components/base/BaseField.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import ReservationQuoteCard from '~/components/reservations/ReservationQuoteCard.vue'
import { useT } from '~/composables/use_t'
import type { BoatPricingRow } from '#shared/types/boat_pricing'
import type { PricingSeasonRow } from '#shared/types/pricing_season'
import type { ClientOption } from '#shared/types/client'
import type { BoatReservationRow, ReservationStatus } from '~/types/reservation'

const props = defineProps<{
  open: boolean
  boatId: number
  reservation: BoatReservationRow | null
  boatPricing: BoatPricingRow | null
  pricingSeasons: PricingSeasonRow[]
  clientOptions?: ClientOption[]
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const { t } = useT()

const form = useForm({
  startsAt: '',
  endsAt: '',
  clientId: '',
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

const clientSelectOptions = computed(() => [
  { value: '', label: t('reservations.form.noClientOption') },
  ...(props.clientOptions ?? []).map((c) => ({ value: String(c.id), label: c.fullName })),
])

watch(
  () => props.reservation,
  (r) => {
    if (!r) return
    form.startsAt = r.startsAt.slice(0, 16)
    form.endsAt = r.endsAt.slice(0, 16)
    form.clientId = r.clientId !== null ? String(r.clientId) : ''
    form.clientName = r.clientName
    form.clientEmail = r.clientEmail ?? ''
    form.clientPhone = r.clientPhone ?? ''
    form.status = r.status
    form.notes = r.notes ?? ''
    form.totalPrice = r.totalPrice ?? ''
  }
)

// Selecting a client conveniently fills the free-text name snapshot.
watch(
  () => form.clientId,
  (clientId) => {
    if (!clientId) return
    const selected = (props.clientOptions ?? []).find((c) => String(c.id) === clientId)
    if (selected) form.clientName = selected.fullName
  }
)

function submit() {
  if (!props.reservation) return
  form
    .transform((data) => ({ ...data, clientId: data.clientId ? Number(data.clientId) : null }))
    .patch(`/boats/${props.boatId}/reservations/${props.reservation.id}`, {
      preserveScroll: true,
      onSuccess: () => emit('update:open', false),
    })
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="t('reservations.form.editTitle')"
    size="xl"
    @update:open="emit('update:open', $event)"
  >
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
        <BaseField :label="t('reservations.form.client')" :error="form.errors.clientId">
          <BaseSelect v-model="form.clientId" :options="clientSelectOptions" />
        </BaseField>
        <BaseField :label="t('reservations.form.clientName')" :error="form.errors.clientName">
          <BaseInput v-model="form.clientName" required />
        </BaseField>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <BaseField :label="t('reservations.form.totalPrice')" :error="form.errors.totalPrice">
            <BaseInput v-model="form.totalPrice" type="number" min="0" step="0.01" />
          </BaseField>
        </div>
        <ReservationQuoteCard
          :pricing="boatPricing"
          :seasons="pricingSeasons"
          :starts-at="form.startsAt"
          :ends-at="form.endsAt"
          @apply="form.totalPrice = String($event)"
        />
      </div>

      <BaseField :label="t('reservations.form.notes')" :error="form.errors.notes">
        <BaseTextarea v-model="form.notes" :rows="3" />
      </BaseField>

      <div class="flex justify-end gap-2">
        <BaseButton type="button" variant="ghost" @click="emit('update:open', false)">
          {{ t('reservations.form.cancel') }}
        </BaseButton>
        <BaseButton type="submit" :disabled="form.processing">
          {{ t('reservations.form.submit') }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
