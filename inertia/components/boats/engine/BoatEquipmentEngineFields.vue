<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/useT'
import { useBoatOptions } from '~/composables/useBoatOptions'
import { ENGINE_KIND_OPTIONS } from '#shared/constants/boats/boat_form_options'

export type BoatEquipmentEngineFieldsModel = {
  id?: number
  kind: string
  fuel: string | null
  brand: string | null
  model: string | null
  serialNumber: string | null
  manufacturedAt: string | null
  powerHp: number | null
  hours: number | null
  status: 'operational' | 'in_maintenance' | 'out_of_service' | 'retired'
}

const props = defineProps<{
  errors: Record<string, string | string[] | undefined>
  engine?: BoatEquipmentEngineFieldsModel | null
}>()

const { t } = useT()
const { engineKindOptions, engineFuelOptions } = useBoatOptions()

const statusOptions = computed(() => [
  { value: 'operational', label: t('equipment.status.operational') },
  { value: 'in_maintenance', label: t('equipment.status.in_maintenance') },
  { value: 'out_of_service', label: t('equipment.status.out_of_service') },
  { value: 'retired', label: t('equipment.status.retired') },
])

const kind = ref('')
const fuel = ref('')
const brand = ref('')
const model = ref('')
const serialNumber = ref('')
const manufacturedAt = ref('')
const powerHp = ref('')
const hours = ref('')
const status = ref('')

function syncFromProps() {
  const e = props.engine
  kind.value = e?.kind ?? ENGINE_KIND_OPTIONS[0]?.value ?? ''
  fuel.value = e?.fuel ?? ''
  brand.value = e?.brand ?? ''
  model.value = e?.model ?? ''
  serialNumber.value = e?.serialNumber ?? ''
  manufacturedAt.value = e?.manufacturedAt ? e.manufacturedAt.slice(0, 10) : ''
  powerHp.value = e?.powerHp === null || e?.powerHp === undefined ? '' : String(e.powerHp)
  hours.value = e?.hours === null || e?.hours === undefined ? '' : String(e.hours)
  status.value = e?.status ?? 'operational'
}

watch(
  () => props.engine,
  () => syncFromProps(),
  { immediate: true }
)
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <BaseSelect
      id="kind"
      name="kind"
      :label="t('boats.engines.fields.kind')"
      :options="engineKindOptions"
      v-model="kind"
      :errors="errors"
    />

    <BaseSelect
      id="fuel"
      name="fuel"
      :label="t('boats.engines.fields.fuel')"
      placeholder="—"
      :allow-empty="true"
      :options="engineFuelOptions"
      v-model="fuel"
      :errors="errors"
    />

    <BaseInput id="brand" name="brand" :label="t('boats.engines.fields.brand')" v-model="brand" :errors="errors" />
    <BaseInput id="model" name="model" :label="t('boats.engines.fields.model')" v-model="model" :errors="errors" />
    <BaseInput
      id="serialNumber"
      name="serialNumber"
      :label="t('boats.engines.fields.serialNumber')"
      v-model="serialNumber"
      :errors="errors"
    />
    <BaseInput
      id="manufacturedAt"
      name="manufacturedAt"
      :label="t('boats.engines.fields.manufacturedAt')"
      type="date"
      v-model="manufacturedAt"
      :errors="errors"
    />
    <BaseInput
      id="powerHp"
      name="powerHp"
      :label="t('boats.engines.fields.powerHp')"
      type="number"
      step="0.1"
      inputmode="decimal"
      v-model="powerHp"
      :errors="errors"
    />
    <BaseInput
      id="hours"
      name="hours"
      :label="t('boats.engines.fields.hours')"
      type="number"
      inputmode="numeric"
      v-model="hours"
      :errors="errors"
    />

    <BaseSelect
      id="status"
      name="status"
      :label="t('equipment.status.label')"
      :options="statusOptions"
      v-model="status"
      :errors="errors"
    />
  </div>
</template>
