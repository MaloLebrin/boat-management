<script setup lang="ts">
import { computed, watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import { TrashIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseSegmentedControl from '~/components/base/BaseSegmentedControl.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import type { PortSpotOption } from '~/composables/use_marina'
import { useT } from '~/composables/use_t'
import { todayDateInputValue } from '~/utils/local_datetime'
import type { ClientOption } from '../../../../shared/types/client'
import type { BoatOption } from '~/types/port'

/**
 * Nouvelle escale (#891) : un bateau de la flotte, ou un visiteur décrit en
 * quelques champs — il n'entre pas dans la flotte ni dans le quota du plan.
 */
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
  guest: 'visitor' as 'visitor' | 'fleet',
  spotId: '' as number | '',
  boatId: '' as number | '',
  clientId: '' as number | '',
  visitorName: '',
  visitorLengthM: '',
  visitorRegistration: '',
  visitorContact: '',
  arrivalOn: '',
  departureOn: '',
  nightlyRate: '',
  services: [] as { label: string; quantity: string; unitPrice: string }[],
  notes: '',
})

const guestOptions = [
  { value: 'visitor', label: t('ports.harbour.stays.form.visitor') },
  { value: 'fleet', label: t('ports.harbour.stays.form.fleetBoat') },
]
const spotOptions = computed(() => props.spots.map((s) => ({ value: s.id, label: s.label })))
const boatOptions = computed(() => props.boats.map((b) => ({ value: b.id, label: b.name })))
const clientOptions = computed(() => props.clients.map((c) => ({ value: c.id, label: c.fullName })))

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    form.reset()
    form.clearErrors()
    form.arrivalOn = todayDateInputValue()
  }
)

const numberOrNull = (value: string) => (value === '' ? null : Number(value))

form.transform((data) => {
  const visitor = data.guest === 'visitor'
  return {
    spotId: data.spotId === '' ? null : data.spotId,
    boatId: visitor || data.boatId === '' ? null : data.boatId,
    clientId: data.clientId === '' ? null : data.clientId,
    visitorName: visitor ? data.visitorName.trim() || null : null,
    visitorLengthM: visitor ? numberOrNull(data.visitorLengthM) : null,
    visitorRegistration: visitor ? data.visitorRegistration.trim() || null : null,
    visitorContact: visitor ? data.visitorContact.trim() || null : null,
    arrivalOn: data.arrivalOn,
    departureOn: data.departureOn,
    nightlyRate: numberOrNull(data.nightlyRate),
    services: data.services
      .filter((line) => line.label.trim() !== '')
      .map((line) => ({
        label: line.label.trim(),
        quantity: Number(line.quantity || 1),
        unitPrice: Number(line.unitPrice || 0),
      })),
    notes: data.notes.trim() || null,
  }
})

function addService() {
  form.services.push({ label: '', quantity: '1', unitPrice: '' })
}

function submit() {
  form.post(`/ports/${props.portId}/marina-stays`, {
    preserveScroll: true,
    onSuccess: () => emit('update:open', false),
  })
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="t('ports.harbour.stays.form.title')"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <BaseSegmentedControl v-model="form.guest" :options="guestOptions" />
      <BaseSelect
        v-if="form.guest === 'fleet'"
        v-model="form.boatId"
        :label="t('ports.harbour.stays.form.boat')"
        :options="boatOptions"
        :error="form.errors.boatId"
        required
      />
      <template v-else>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <BaseInput
            v-model="form.visitorName"
            :label="t('ports.harbour.stays.form.visitorName')"
            :error="form.errors.visitorName"
            required
          />
          <BaseInput
            v-model="form.visitorLengthM"
            type="number"
            step="0.01"
            min="0"
            :label="t('ports.harbour.stays.form.visitorLength')"
            :error="form.errors.visitorLengthM"
          />
          <BaseInput
            v-model="form.visitorRegistration"
            :label="t('ports.harbour.stays.form.visitorRegistration')"
          />
          <BaseInput
            v-model="form.visitorContact"
            :label="t('ports.harbour.stays.form.visitorContact')"
          />
        </div>
      </template>
      <BaseSelect
        v-model="form.spotId"
        :label="t('ports.harbour.stays.form.spot')"
        :options="spotOptions"
        :error="form.errors.spotId"
        required
      />
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BaseInput
          v-model="form.arrivalOn"
          type="date"
          :label="t('ports.harbour.stays.form.arrival')"
          :error="form.errors.arrivalOn"
          required
        />
        <BaseInput
          v-model="form.departureOn"
          type="date"
          :label="t('ports.harbour.stays.form.departure')"
          :error="form.errors.departureOn"
          required
        />
        <BaseInput
          v-model="form.nightlyRate"
          type="number"
          step="0.01"
          min="0"
          :label="t('ports.harbour.stays.form.nightlyRate')"
          :hint="t('ports.harbour.stays.form.nightlyRateHint')"
          :error="form.errors.nightlyRate"
        />
      </div>
      <BaseSelect
        v-model="form.clientId"
        :label="t('ports.harbour.stays.form.client')"
        :options="clientOptions"
        :placeholder="t('ports.harbour.stays.form.noClient')"
        allow-empty
      />
      <fieldset class="space-y-2">
        <legend class="text-sm font-semibold text-fg">
          {{ t('ports.harbour.stays.form.services') }}
        </legend>
        <div v-for="(line, index) in form.services" :key="index" class="flex items-end gap-2">
          <BaseInput
            v-model="line.label"
            class="flex-1"
            :label="t('ports.harbour.stays.form.serviceLabel')"
          />
          <BaseInput
            v-model="line.quantity"
            class="w-20"
            type="number"
            step="0.01"
            min="0"
            :label="t('ports.harbour.stays.form.serviceQty')"
          />
          <BaseInput
            v-model="line.unitPrice"
            class="w-28"
            type="number"
            step="0.01"
            min="0"
            :label="t('ports.harbour.stays.form.servicePrice')"
          />
          <BaseButton
            type="button"
            variant="ghost"
            size="sm"
            @click="form.services.splice(index, 1)"
          >
            <TrashIcon class="h-4 w-4 text-danger" />
            <span class="sr-only">{{ t('ports.harbour.stays.form.removeService') }}</span>
          </BaseButton>
        </div>
        <BaseButton type="button" variant="secondary" size="sm" @click="addService">
          {{ t('ports.harbour.stays.form.addService') }}
        </BaseButton>
      </fieldset>
      <BaseTextarea v-model="form.notes" :label="t('ports.harbour.stays.form.notes')" :rows="2" />
      <div class="flex justify-end gap-2 pt-2">
        <BaseButton variant="secondary" type="button" @click="emit('update:open', false)">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton type="submit" :disabled="form.processing">{{ t('common.save') }}</BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
