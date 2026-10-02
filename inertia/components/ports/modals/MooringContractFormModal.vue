<script setup lang="ts">
import { computed, watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import type { PortSpotOption } from '~/composables/use_marina'
import { useT } from '~/composables/use_t'
import { todayDateInputValue } from '~/utils/local_datetime'
import { MOORING_CONTRACT_PERIODICITIES } from '../../../../shared/constants/marina'
import type { ClientOption } from '../../../../shared/types/client'
import type { MooringContractPeriodicity } from '../../../../shared/types/marina'
import type { BoatOption } from '~/types/port'

/** Nouveau contrat d'amarrage (#891) — les factures suivent seules, en brouillon. */
const props = defineProps<{
  open: boolean
  portId: number
  spots: PortSpotOption[]
  boats: BoatOption[]
  clients: ClientOption[]
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const { t } = useT()

const form = useForm({
  spotId: '' as number | '',
  clientId: '' as number | '',
  boatId: '' as number | '',
  startsOn: '',
  endsOn: '',
  periodicity: 'monthly' as MooringContractPeriodicity,
  amount: '',
  notes: '',
})

const spotOptions = computed(() => props.spots.map((s) => ({ value: s.id, label: s.label })))
const clientOptions = computed(() => props.clients.map((c) => ({ value: c.id, label: c.fullName })))
const boatOptions = computed(() => props.boats.map((b) => ({ value: b.id, label: b.name })))
const periodicityOptions = MOORING_CONTRACT_PERIODICITIES.map((value) => ({
  value,
  label: t(`ports.harbour.contracts.periodicity.${value}`),
}))

/** Le montant suggéré suit le tarif de la place pour la périodicité choisie. */
const suggestedAmount = computed(() => {
  const spot = props.spots.find((s) => s.id === form.spotId)?.spot
  if (!spot) return null
  if (form.periodicity === 'annual') return spot.annualRate
  if (form.periodicity === 'monthly') return spot.monthlyRate
  return spot.monthlyRate === null ? null : Math.round(spot.monthlyRate * 3 * 100) / 100
})

watch(suggestedAmount, (amount) => {
  if (amount !== null) form.amount = String(amount)
})

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    form.reset()
    form.clearErrors()
    form.startsOn = todayDateInputValue()
  }
)

form.transform((data) => ({
  spotId: data.spotId === '' ? null : data.spotId,
  clientId: data.clientId === '' ? null : data.clientId,
  boatId: data.boatId === '' ? null : data.boatId,
  startsOn: data.startsOn,
  endsOn: data.endsOn === '' ? null : data.endsOn,
  periodicity: data.periodicity,
  amount: data.amount === '' ? null : Number(data.amount),
  notes: data.notes.trim() || null,
}))

function submit() {
  form.post(`/ports/${props.portId}/mooring-contracts`, {
    preserveScroll: true,
    onSuccess: () => emit('update:open', false),
  })
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="t('ports.harbour.contracts.form.title')"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <p class="text-sm text-fg-muted">{{ t('ports.harbour.contracts.form.hint') }}</p>
      <BaseSelect
        v-model="form.clientId"
        :label="t('ports.harbour.contracts.form.client')"
        :options="clientOptions"
        :error="form.errors.clientId"
        required
      />
      <BaseSelect
        v-model="form.spotId"
        :label="t('ports.harbour.contracts.form.spot')"
        :options="spotOptions"
        :error="form.errors.spotId"
        required
      />
      <BaseSelect
        v-model="form.boatId"
        :label="t('ports.harbour.contracts.form.boat')"
        :options="boatOptions"
        :placeholder="t('ports.harbour.contracts.form.noBoat')"
        allow-empty
      />
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BaseInput
          v-model="form.startsOn"
          type="date"
          :label="t('ports.harbour.contracts.form.startsOn')"
          :error="form.errors.startsOn"
          required
        />
        <BaseInput
          v-model="form.endsOn"
          type="date"
          :label="t('ports.harbour.contracts.form.endsOn')"
          :error="form.errors.endsOn"
        />
        <BaseSelect
          v-model="form.periodicity"
          :label="t('ports.harbour.contracts.form.periodicity')"
          :options="periodicityOptions"
          :error="form.errors.periodicity"
        />
        <BaseInput
          v-model="form.amount"
          type="number"
          step="0.01"
          min="0"
          :label="t('ports.harbour.contracts.form.amount')"
          :error="form.errors.amount"
          required
        />
      </div>
      <BaseTextarea
        v-model="form.notes"
        :label="t('ports.harbour.contracts.form.notes')"
        :rows="2"
      />
      <div class="flex justify-end gap-2 pt-2">
        <BaseButton variant="secondary" type="button" @click="emit('update:open', false)">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton type="submit" :disabled="form.processing">{{ t('common.save') }}</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
