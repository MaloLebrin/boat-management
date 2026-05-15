<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/useT'
import { useBoatOptions } from '~/composables/useBoatOptions'
import { SAIL_TYPE_OPTIONS } from '#shared/constants/boats/boat_form_options'

export type BoatEquipmentSailFieldsModel = {
  id?: number
  sailType: string
  manufacturedAt: string | null
  areaM2: number | null
  material: string | null
  reefPoints: number | null
  status: 'operational' | 'in_maintenance' | 'out_of_service' | 'retired'
}

const props = defineProps<{
  errors: Record<string, string | string[] | undefined>
  sail?: BoatEquipmentSailFieldsModel | null
}>()

const { t } = useT()
const { sailTypeOptions } = useBoatOptions()

const statusOptions = computed(() => [
  { value: 'operational', label: t('equipment.status.operational') },
  { value: 'in_maintenance', label: t('equipment.status.in_maintenance') },
  { value: 'out_of_service', label: t('equipment.status.out_of_service') },
  { value: 'retired', label: t('equipment.status.retired') },
])

const sailType = ref('')
const manufacturedAt = ref('')
const areaM2 = ref('')
const material = ref('')
const reefPoints = ref('')
const status = ref('')

function syncFromProps() {
  const s = props.sail
  sailType.value = s?.sailType ?? SAIL_TYPE_OPTIONS[0]?.value ?? 'main'
  manufacturedAt.value = s?.manufacturedAt ? s.manufacturedAt.slice(0, 10) : ''
  areaM2.value = s?.areaM2 === null || s?.areaM2 === undefined ? '' : String(s.areaM2)
  material.value = s?.material ?? ''
  reefPoints.value = s?.reefPoints === null || s?.reefPoints === undefined ? '' : String(s.reefPoints)
  status.value = s?.status ?? 'operational'
}

watch(
  () => props.sail,
  () => syncFromProps(),
  { immediate: true }
)
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <BaseSelect
      id="sailType"
      name="sailType"
      :label="t('boats.hullFields.type')"
      :options="sailTypeOptions"
      v-model="sailType"
      :errors="errors"
    />

    <BaseInput
      id="manufacturedAt"
      name="manufacturedAt"
      :label="t('boats.hullFields.manufacturedAt')"
      type="date"
      v-model="manufacturedAt"
      :errors="errors"
    />

    <BaseInput
      id="areaM2"
      name="areaM2"
      label="Area (m²)"
      type="number"
      step="0.1"
      inputmode="decimal"
      v-model="areaM2"
      :errors="errors"
    />

    <BaseInput
      id="material"
      name="material"
      label="Material"
      v-model="material"
      :errors="errors"
    />

    <BaseInput
      id="reefPoints"
      name="reefPoints"
      :label="t('boats.sails.reef')"
      type="number"
      inputmode="numeric"
      v-model="reefPoints"
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
