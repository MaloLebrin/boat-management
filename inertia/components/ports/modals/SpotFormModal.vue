<script setup lang="ts">
import { watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'
import { SPOT_KINDS, SPOT_STATUSES } from '../../../../shared/constants/marina'
import type { SpotKind, SpotStatus } from '../../../../shared/types/spot'
import type { SpotRow } from '~/types/port'

const props = defineProps<{
  open: boolean
  portId: number
  pontoonId?: number | null
  mouillageId?: number | null
  spot?: SpotRow | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useT()

const NUMERIC_FIELDS = [
  'lengthM',
  'beamM',
  'draftM',
  'dailyRate',
  'monthlyRate',
  'annualRate',
] as const

const form = useForm({
  name: '',
  description: '',
  lengthM: '',
  beamM: '',
  draftM: '',
  kind: 'annual' as SpotKind,
  status: 'available' as SpotStatus,
  dailyRate: '',
  monthlyRate: '',
  annualRate: '',
  notes: '',
})

const kindOptions = SPOT_KINDS.map((value) => ({ value, label: t(`ports.spots.kinds.${value}`) }))
const statusOptions = SPOT_STATUSES.map((value) => ({
  value,
  label: t(`ports.spots.statuses.${value}`),
}))

function asInput(value: number | null): string {
  return value === null ? '' : String(value)
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.spot) {
      form.name = props.spot.name
      form.description = props.spot.description ?? ''
      for (const field of NUMERIC_FIELDS) form[field] = asInput(props.spot[field])
      form.kind = props.spot.kind
      form.status = props.spot.status
      form.notes = props.spot.notes ?? ''
    } else if (isOpen) {
      form.reset()
    }
  }
)

// Un champ numérique vidé part en `null` (efface la valeur), jamais en `''`.
form.transform((data) => {
  const out: Record<string, unknown> = { ...data, notes: data.notes.trim() || null }
  for (const field of NUMERIC_FIELDS) out[field] = data[field] === '' ? null : Number(data[field])
  return out
})

function handleSubmit() {
  const onSuccess = () => emit('update:open', false)

  if (props.spot) {
    form.put(`/spots/${props.spot.id}`, { onSuccess })
  } else if (props.pontoonId) {
    form.post(`/ports/${props.portId}/pontoons/${props.pontoonId}/spots`, { onSuccess })
  } else if (props.mouillageId) {
    form.post(`/ports/${props.portId}/mouillages/${props.mouillageId}/spots`, { onSuccess })
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="spot ? t('ports.spots.edit') : t('ports.spots.add')"
    @update:open="emit('update:open', $event)"
  >
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <BaseInput
        v-model="form.name"
        :label="t('ports.spots.fields.name')"
        :error="form.errors.name"
        required
      />
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BaseSelect
          v-model="form.kind"
          :label="t('ports.spots.fields.kind')"
          :options="kindOptions"
          :error="form.errors.kind"
        />
        <BaseSelect
          v-model="form.status"
          :label="t('ports.spots.fields.status')"
          :options="statusOptions"
          :error="form.errors.status"
        />
      </div>

      <fieldset class="space-y-2">
        <legend class="text-sm font-semibold text-fg">
          {{ t('ports.spots.sections.dimensions') }}
        </legend>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <BaseInput
            v-for="field in ['lengthM', 'beamM', 'draftM'] as const"
            :key="field"
            v-model="form[field]"
            type="number"
            step="0.01"
            min="0"
            :label="t(`ports.spots.fields.${field}`)"
            :error="form.errors[field]"
          />
        </div>
      </fieldset>

      <fieldset class="space-y-2">
        <legend class="text-sm font-semibold text-fg">
          {{ t('ports.spots.sections.pricing') }}
        </legend>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <BaseInput
            v-for="field in ['dailyRate', 'monthlyRate', 'annualRate'] as const"
            :key="field"
            v-model="form[field]"
            type="number"
            step="0.01"
            min="0"
            :label="t(`ports.spots.fields.${field}`)"
            :error="form.errors[field]"
          />
        </div>
      </fieldset>

      <BaseTextarea
        v-model="form.description"
        :label="t('ports.spots.fields.description')"
        :error="form.errors.description"
        :rows="2"
      />
      <BaseTextarea
        v-model="form.notes"
        :label="t('ports.spots.fields.notes')"
        :error="form.errors.notes"
        :rows="2"
      />
      <div class="flex justify-end gap-2 pt-2">
        <BaseButton variant="secondary" type="button" @click="emit('update:open', false)">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton type="submit" :disabled="form.processing">
          {{ t('common.save') }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
